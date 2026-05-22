# PRD：修复 Electron PDF 生成中 CSS 样式无法充分应用的问题

## Problem Statement

用户在样式调整面板（StyleAdjustmentPanel）中修改主题或自定义 CSS 后，点击预览/导出 PDF 时，生成的 PDF 中 CSS 样式无法充分应用。具体表现：

1. **双重边距**：`injectPageCss()` 在 CSS 中设置 `@page { margin }` 的同时，`printToPDF()` API 也传递了 margins 参数，两者叠加导致内容区被过度挤压，布局错乱。
2. **两套渲染实现不一致**：浏览器预览（`renderMarkdownContent` in useResumeRenderer）和 PDF 导出（`markdownToHtml` in ResumeGeneratorNew.vue）使用不同的 Marked 实例和 HTML 结构，导致预览与导出效果不一致。
3. **截图宽度不对齐 A4**：`capturePageImagesByPdfBreaks()` 使用 894px 作为视口宽度，但 A4 内容区实际为 794px（@ 96dpi），导致预览截图与 PDF 实际分页错位。
4. **`/api/pdf` 接口缺少 `@page` 注入**：`main.cjs` 的 `generatePdf()` 没有调用 `injectPageCss()`，导致 PDF 不分页。
5. **themeStyles 和 customStyles 合并传递**：在 `useResumeTheme` 中合并为一个 `extraStyles` 字符串，失去了独立追踪能力，无法在切换主题时保留自定义样式。

## Solution

1. 移除 `injectPageCss()` 中的 `@page { margin }`，仅保留 `size: A4` 和 `page-break-*` 规则，由 `printToPDF()` API 全权控制边距。
2. 统一渲染管线：提取 `markdownToHtml()` 到 `useResumeRenderer`，与 `renderMarkdownContent()` 共享同一 Marked 实例，消除预览/导出差异。
3. 将 `capturePageImagesByPdfBreaks()` 的 `A4_VIEWPORT_WIDTH_PX` 修正为 A4 实际内容宽 794px。
4. 确保 `/api/pdf`（`generatePdf`）也调用 `injectPageCss()`。
5. 将 `themeStyles` 和 `customStyles` 作为两个独立 CSS 块注入 HTML，切换主题时只替换 themeStyles，customStyles 持久保留。

## User Stories

1. As a resume author, I want the PDF I export to look exactly like the browser preview, so that I don't have to manually adjust after export.
2. As a resume author, I want to switch themes (e.g., from "商务蓝" to "现代紫") without losing my custom CSS adjustments, so that I can experiment with different looks.
3. As a resume author, I want the PDF page margins to be correct (not double-applied), so that the content fits properly on each A4 page.
4. As a resume author, I want the preview page images to align with the actual PDF pages, so that what I see in preview matches what I get on paper.
5. As a resume author, I want both PDF export paths (`/api/preview` and `/api/pdf`) to produce consistently paginated output, so that downloads always work.
6. As an AI agent modifying styles via the chat panel, I want to target `customStyles` independently from `themeStyles`, so that my incremental style changes don't interfere with the theme system.
7. As a developer, I want a single source of truth for Markdown-to-HTML rendering, so that I don't need to keep two implementations in sync.

## Implementation Decisions

### Decision 1 — 移除 `injectPageCss()` 中的 `@page { margin }`

`injectPageCss()` 当前同时设置 `@page { size: A4; margin: Npx }` 和 `printToPDF({ margins })`，边距叠加。修改为：`injectPageCss()` 仅注入分页行为（`size: A4` + `page-break-*`），由 `printToPDF()` API 控制实际边距，因为后者是 Chromium 原生机制，更可靠且优先级更高。

### Decision 2 — 统一渲染管线

当前有两个独立的 Marked 实例和渲染逻辑：
- `useResumeRenderer.ts` 的 `renderMarkdownContent()` → 用于浏览器预览（PdfPageView）
- `ResumeGeneratorNew.vue` 的 `markdownToHtml()` → 用于 Electron PDF

修改方案：
- 将 `markdownToHtml()` 的逻辑提取到 `useResumeRenderer.ts`，新增 `buildPdfHtmlDocument()` 函数
- 该函数复用 `createMarkedInstance()` 共享单例（与预览一致）
- 参数拆分：接收 `themeStyles` + `customStyles` 两个独立参数
- `ResumeGeneratorNew.vue` 改为调用 `buildPdfHtmlDocument(md, themeStyles, customStyles)`

### Decision 3 — CSS 注入顺序（HTML 内）

生成的 HTML 中 CSS 注入顺序为三个独立 `<style>` 块：

1. **基线 CSS**（RESUME_CSS + PDF 容器 reset）—— 不可变
2. **主题 CSS**（themeStyles）—— 切换主题时整套替换
3. **自定义 CSS**（customStyles）—— 切换主题时保留，排在最后自然覆盖同选择器

这样确保了 CSS 优先级：基线 < 主题 < 自定义，且主题和自定义可独立管理。

### Decision 4 — 修正截图宽度

`capturePageImagesByPdfBreaks()` 中的 `A4_VIEWPORT_WIDTH_PX` 从 894px 修正为 794px（A4 纸宽 210mm × 96dpi / 25.4 ≈ 794px）。这样 `capturePage()` 截取的可视区域与 `printToPDF()` 生成的实际 PDF 页宽对齐，预览截图不再错位。

### Decision 5 — `/api/pdf` 注入 `@page`

在 `main.cjs` 的 `generatePdf()` 函数中也调用 `injectPageCss()`，确保直接下载 PDF 时也能正确按 A4 分页。

### Decision 6 — BrowserWindow 尺寸对齐 A4

将 BrowserWindow 创建宽度从 940px 修正为 794px（A4 内容宽），避免 `capturePage()` 截图时因 resize 触发 CSS 重排。

## Module Design

### Module A — `injectPageCss()` (electron/main.cjs)

**修改前接口：**
```
injectPageCss(html, marginTop, marginBottom, marginLeft, marginRight) → html
```

**修改后接口：**
```
injectPageCss(html) → html
```

移除 margin 参数，仅注入：
```css
@page { size: A4; }
h1, h2, h3, h4, h5, h6 { page-break-after: avoid; }
img, table, pre { page-break-inside: avoid; }
```

### Module B — `buildPdfHtmlDocument()` (src/composables/useResumeRenderer.ts)

**新增函数：**
```
buildPdfHtmlDocument(content: string, themeStyles: string, customStyles: string) → string
```

复用 `createMarkedInstance()` 共享单例，返回完整 HTML 文档字符串，包含三个独立 `<style>` 块。

### Module C — `generatePdf()` 修改 (electron/main.cjs)

在加载 HTML 前调用 `injectPageCss(html)`。

### Module D — BrowserWindow 尺寸修改 (electron/main.cjs)

```js
const A4_WIDTH = 794;  // 从 940 改为 794
```

### Module E — `capturePageImagesByPdfBreaks()` 尺寸修正 (electron/main.cjs)

```js
const A4_VIEWPORT_WIDTH_PX = 794;  // 从 894 改为 794
```

## Testing Decisions

### 测试策略

- 只测试外部行为，不测试实现细节
- 对 Electron 侧 `injectPageCss()` 做单元测试（纯函数，无 DOM 依赖）
- 对 `buildPdfHtmlDocument()` 做单元测试（验证 HTML 结构、CSS 块顺序）

### 测试用例

**`injectPageCss()` 测试：**
- 输入不含 `</head>` 的 HTML → 验证 `<style>` 块正确插入
- 输入含 `</head>` 的 HTML → 验证在 `</head>` 前插入
- 验证输出不包含 `margin:` 声明
- 验证输出包含 `@page { size: A4; }`
- 验证输出包含 `page-break-after: avoid` 对 h1-h6

**`buildPdfHtmlDocument()` 测试：**
- 验证输出 HTML 包含三个 `<style>` 块
- 验证 CSS 顺序：RESUME_CSS → themeStyles → customStyles
- 验证 customStyles 为空时只输出两个 `<style>` 块
- 验证 Markdown 内容正确解析并包裹在 `.resume-document` 中

### 测试放置

- `electron/` 目录下的测试：使用原生 Node.js 断言或 Jest
- `src/composables/` 目录下的测试：使用 Vitest（与项目现有测试框架一致）

## Out of Scope

- 不修改 `useExport.ts` 的 html2canvas + jsPDF 降级路径（html2canvas 的 CSS 限制是其自身限制，非本次修复范围）
- 不修改 `main.js`（旧版主进程文件，已不再使用）
- 不修改前端的 `StyleAdjustmentPanel` 组件接口
- 不添加新的主题 CSS

## Further Notes

- 当前 `package.json` 的 Electron 入口为 `electron/main.cjs`（`electron:dev` 脚本），`main.js` 为旧版，后续可考虑删除。
- `main.cjs` 使用了 `.cjs` 后缀因为 `package.json` 声明 `"type": "module"`，而 Electron 主进程需要 CommonJS。
- `printToPDF()` 的 `margins` 参数单位为英寸（CSS 像素 / 96），与前端约定一致。
- A4 尺寸常量已有多处定义（`main.js` 和 `main.cjs` 各有一套），本次不改动 DRY 问题（超出范围）。
