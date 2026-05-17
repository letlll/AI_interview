## Problem Statement

当前「精确预览」（Electron 模式）使用 `/api/preview` 返回的 `pageImages`（Chromium 截图）来展示简历预览。截图与用户最终下载的 PDF（`pdfBase64`）之间存在视觉差异——截图无页眉页脚，下载的 PDF 有页眉页脚页码。用户预览的是一个东西，下载的是另一个东西，所见非所得。

同时，当前 PDF 下载流程需要经过两步：先打开一个「PDF 预览」弹窗确认，再点击「确认下载」按钮。这个弹窗增加了不必要的交互步骤。

## Solution

精确预览面板改用 PDF.js 直接渲染 `/api/preview` 返回的 `pdfBase64`（与下载的 PDF 是同一个数据源），实现所见即所得。下载按钮精简为一步，不再需要中间弹窗确认。

## User Stories

1. 作为求职者，我希望精确预览中看到的内容与下载的 PDF 完全一致，以便我能准确判断简历排版效果
2. 作为求职者，我希望点击「下载 PDF」按钮后立即下载，无需经过中间弹窗确认，以便减少操作步骤
3. 作为求职者，我希望精确预览中每页以 A4 比例垂直堆叠显示，并标注页码，以便我能直观看到分页位置
4. 作为求职者，我希望精确预览的首个页面能快速渲染（优先显示），后续页面渐进加载，以便我不用等待全部页面渲染完成才能看到第一页
5. 作为求职者，当 Electron 服务未启动时，我希望精确预览给出明确的错误提示，以便我知道如何排查问题
6. 作为开发者，我希望 PDF 渲染逻辑封装为可复用的 composable，以便其他组件（如报告预览）也能使用

## Implementation Decisions

### 新增模块：`usePdfRenderer` composable

封装 PDF.js 渲染逻辑的深层模块，接口如下：

- **输入**：`pdfBase64: Ref<string | null>` 和 `scale?: number`（默认 2，适配 Retina）
- **输出**：`pages: Ref<{ canvas: HTMLCanvasElement; pageNum: number }[]>`、`pageCount: Ref<number>`、`loading: Ref<boolean>`、`error: Ref<string | null>`
- **渐进渲染**：当 `pdfBase64` 变化时，先渲染第一页并立即推入 `pages` 数组，其余页面在 `requestAnimationFrame` 中异步继续渲染，逐步追加
- 使用 `pdfjs-dist` 的 `getDocument()` 加载 PDF，逐页调用 `page.render()` 渲染到 canvas

### 修改模块：`ResumeGeneratorNew.vue`

**模板变更：**
- 精确预览面板（`rightPanelMode === 'electron'`）中，将 `<img :src="pageImage">` 替换为 `<canvas>` 元素，由 `usePdfRenderer` 返回的 `pages` 驱动渲染
- 删除 `<el-dialog v-model="pdfPreviewVisible">` 整个 PDF 预览弹窗（模板 + CSS 共享类保留）

**脚本变更：**
- 移除 `electronPreviewResult` 类型中的 `pageImages` 字段，仅保留 `pageCount` 和 `pdfBase64`
- 删除以下状态变量：`pdfPreviewVisible`、`pdfPreviewLoading`、`pdfPreviewLoadingText`、`pdfPreviewPages`、`pdfPreviewPdfBase64`、`pdfDownloading`、`exportFallbackMode`
- 删除 `ELECTRON_PREVIEW_URL` 常量
- 删除函数：`openPdfPreview()`、`fetchPreview()`、`confirmPdfDownload()`
- 移除 `import { useExport } from '@/composables/useExport'`
- 新增 `import { usePdfRenderer } from '@/composables/usePdfRenderer'`，在精确预览面板中使用
- `handleRefreshElectronPreview()` 中不再存储 `pageImages`

**已存在的下载按钮保留**：顶部工具栏已有「下载 PDF」按钮调用 `handleDownloadPdf()`，直接使用 `electronPreviewResult.pdfBase64` 触发下载，无需额外修改。

### 依赖变更

- **新增**：`pdfjs-dist`（PDF.js 库，用于在浏览器中解析和渲染 PDF）
- **保留**：`html2canvas`、`jsPDF`、`useExport` — 仍被 `AnalysisReportDetail.vue`、`ReportDetail.vue`、`ResumePreview.vue` 使用，不删除

### 后端不变

`/api/preview` 接口保持不变，仍返回 `pageImages` + `pdfBase64` + `pageCount`。前端仅忽略 `pageImages` 字段。

## Testing Decisions

- `usePdfRenderer` 应进行单元测试，验证：输入有效 base64 后能返回正确页数的 canvas、输入 null 时不报错、渲染失败时 error 有值
- 测试应只验证外部行为（输入输出），不验证内部 PDF.js 调用细节
- 现有的项目测试模式参考 `src/composables/` 下其他 composable 的测试（如有）

## Out of Scope

- Electron 端 `/api/preview` 的修改（仍生成 `pageImages`）
- 打印预览（`rightPanelMode === 'print'`）的分页逻辑修改
- Markdown 预览（`rightPanelMode === 'markdown'`）的任何改动
- `AnalysisReportDetail.vue` 和 `ReportDetail.vue` 的 PDF 导出（仍使用 `useExport`）
- 当 Electron 不可用时的 fallback 渲染（直接显示错误，不降级）

## Further Notes

- PDF.js 的 worker 需要配置正确的路径。使用 `pdfjs-dist` 内置的 worker 或通过 `GlobalWorkerOptions.workerSrc` 指定 CDN
- 精确预览容器 `.electron-preview-container` 的 CSS 样式（宽度、居中、背景色）保持不变，canvas 直接替换 img 位置
- 已存在的 CSS 类名（`.pdf-preview-page`、`.pdf-preview-page-label` 等）同时被删除的弹窗和保留的精确预览面板使用，保留不动
