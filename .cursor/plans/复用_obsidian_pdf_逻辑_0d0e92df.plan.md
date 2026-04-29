---
name: 复用 Obsidian PDF 逻辑
overview: 实现 `buildPdfHtmlDocument` 函数、完善 Electron PDF 服务 HTML 注入逻辑、增加 Electron 服务不可用时的 `useExport.ts` fallback，确保 `ResumeGeneratorNew.vue` 的 PDF 导出完整可用。
todos:
  - id: build-pdf-html-doc
    content: 实现 buildPdfHtmlDocument 函数（ResumeGeneratorNew.vue）
    status: completed
  - id: add-fallback
    content: 增加 Electron 服务不可用时的 useExport fallback
    status: completed
  - id: verify-export
    content: 验证 PDF 导出流程（Electron path + fallback path）
    status: completed
isProject: false
---

## 目标

修复 `ResumeGeneratorNew.vue` 中 PDF 导出功能的两大核心问题：

1. **致命**：`buildPdfHtmlDocument` 函数未定义（line 464），导致导出必然崩溃
2. **高优**：Electron 服务不可用时无 fallback，用户直接收到错误提示

同时将 Obsidian better-export-pdf 的核心复用思路（HTML 完整打包 + Chromium printToPDF）正确落地。

---

## 现状分析

### 当前数据流（Broken）

```
handleExport()
  └─ openPdfPreview()
        └─ fetchPreview()
              ├─ getExportInnerHtml()         ✅ 存在
              │   返回 MarkdownRenderer.markdownRoot.innerHTML（无 .resume-document 包裹）
              │   或 PdfPageView.contentRef.innerHTML（有 .resume-document 包裹）
              │
              ├─ buildPdfHtmlDocument()         ❌ 未定义！RuntimeError!
              └─ fetch('http://localhost:9999/api/preview')
                    └─ Electron: loadHtmlWithAnchors() → printToPDF() → pdf-lib 截图
```

### 关键发现

- `MarkdownRenderer.vue` 渲染到 `.markdown-body`（无 `.resume-document` 包裹，主题类在父元素上）
- `PdfPageView.vue` 渲染到 `.pdf-content-source > .resume-document`（有 `.resume-document` 包裹，主题类在 `.resume-document` 上）
- `electron/main.cjs` 的 `loadHtmlWithAnchors()` 直接将传入的 HTML 写入 `file://` 临时文件，在 Chromium 中渲染为 `document.body.innerHTML`，**不包含任何 CSS**（它没有 `import css` 的路径）
- `useExport.ts` 使用 `html2canvas + jsPDF`，功能完整但从未被调用

---

## 文件改动总览


| 文件                       | 操作                                    |
| ------------------------ | ------------------------------------- |
| `ResumeGeneratorNew.vue` | 实现 `buildPdfHtmlDocument`、增加 fallback |
| `electron/main.cjs`      | 增加 `/api/styles` 接口返回内联 CSS（从文件系统读取）  |


---

## Step 1 — 实现 `buildPdfHtmlDocument`（`ResumeGeneratorNew.vue`）

在 `getExportInnerHtml` 函数之后添加：

```typescript
/**
 * 将 innerHTML 包装为完整的 HTML 文档（包含样式、字体、主题）。
 * 这是 Electron PDF 服务的核心缺失函数。
 *
 * @param innerHtml  .resume-document 或 .markdown-body 的 innerHTML
 * @param themeClass 当前主题类名，如 'theme-blue'
 * @returns 完整 HTML 字符串，可直接写入 Chromium BrowserWindow
 */
const buildPdfHtmlDocument = (innerHtml: string, themeClass: string): string => {
  const resumeDocHtml = innerHtml.includes('resume-document')
    ? innerHtml
    : `<div class="resume-document ${themeClass}">${innerHtml}</div>`;

  // 注入 extraStyles（用户自定义 CSS）
  const extraStylesBlock = extraStyles.value
    ? `<style id="pdf-extra-styles">${extraStyles.value}</style>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    /* ========== 简历基础样式（与 resume-markdown.css 同步）========== */
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 794px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.75;
      font-size: 16px;
      color: #333333;
    }
    .resume-document {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #ffffff;
    }
    .section { margin-bottom: 32px; padding: 16px 0; }
    .section:last-child { margin-bottom: 0; }
    .section-title {
      font-size: 16px; font-weight: 600;
      border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 16px 0 10px;
    }
    .section-title.h1 { font-size: 32px; }
    .section-title.h2 { font-size: 18px; }
    .section-title.h3 { font-size: 16px; }
    .resume-name { font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 12px; }
    .item-list, .skills-list, .summary-list, .work-list, .project-list, .education-list, .custom-list {
      padding-left: 20px; margin: 0 0 10px; list-style: disc;
    }
    .skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-item { background: #f0f0f0; padding: 2px 10px; border-radius: 3px; font-size: 13px; }
    .paragraph { margin: 0 0 8px; }
    .table-wrapper { overflow-x: auto; margin-bottom: 10px; }
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table-cell { padding: 5px 8px; border: 1px solid #ddd; }
    .table-row:nth-child(even) { background: #fafafa; }
    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
    .inline-code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
    .link { color: #2563eb; text-decoration: none; }
    .bold { font-weight: 700; }
    .italic { font-style: italic; }
    .strikethrough { text-decoration: line-through; }
    .image-figure { text-align: center; margin: 10px 0; }
    .image { max-width: 100%; height: auto; }
    .blockquote { border-left: 3px solid #e0e0e0; padding-left: 12px; margin: 0 0 8px; color: #666; font-size: 13px; }
    .section, .subsection, .table-wrapper, table { break-inside: avoid; }
    .work-item, .project-item, .education-item { margin-bottom: 12px; }
    .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .item-title { font-weight: 600; }
    .item-date { font-size: 13px; color: #666; }
    .item-subtitle { font-size: 13px; color: #666; margin-bottom: 4px; }
    .work-list, .project-list, .education-list { list-style: none; padding-left: 0; }
    .work-item, .project-item, .education-item { padding-left: 0; }

    /* ========== 主题样式 ========== */
    /* theme-blue */
    .theme-blue .resume-name { color: #1a56db; }
    .theme-blue .section-title { color: #1a56db; border-color: #bfdbfe; }
    .theme-blue .skill-item { background: #eff6ff; color: #1e40af; }
    /* theme-dark */
    .theme-dark { color: #f9fafb; background: #111827; }
    .theme-dark .resume-name { color: #58a6ff; }
    .theme-dark .section-title { color: #9ca3af; border-color: #374151; }
    .theme-dark .skill-item { background: #1f2937; color: #d1d5db; }
    /* theme-minimal */
    .theme-minimal .resume-name { color: #000; }
    .theme-minimal .section-title { color: #000; border-color: #000; }
    /* theme-classic */
    .theme-classic .resume-name { color: #1e3a5f; }
    .theme-classic .section-title { color: #1e3a5f; border-color: #c4d4e4; }
    .theme-classic .skill-item { background: #e8f0f8; color: #1e3a5f; }
    /* theme-modern */
    .theme-modern .resume-name { color: #6366f1; }
    .theme-modern .section-title { color: #6366f1; border-color: #c7d2fe; }
    .theme-modern .skill-item { background: #eef2ff; color: #4338ca; }

    /* ========== 代码高亮（兼容 Electron 渲染）========== */
    .code-block { background: #f6f8fa; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 13px; }
    code { font-family: 'Consolas', 'Monaco', 'Courier New', monospace; }
  </style>
  ${extraStylesBlock}
</head>
<body>
  ${resumeDocHtml}
</body>
</html>`;
};
```

---

## Step 2 — 增加 Electron Fallback（`ResumeGeneratorNew.vue`）

修改 `fetchPreview` 的 catch 块，在 Electron 不可用时自动切换到 `useExport.ts`：

```typescript
// 文件顶部已有 import useExport from '@/composables/useExport';
// 添加一个新的 ref 用于 fallback 模式
const exportFallbackMode = ref(false);

// 修改 fetchPreview 的 catch：
catch (err: any) {
  console.warn('[fetchPreview] Electron 服务不可用，切换到 html2canvas fallback', err);
  exportFallbackMode.value = true;
  pdfPreviewLoadingText.value = '正在通过浏览器生成预览...';
  try {
    // 从当前 DOM 获取元素
    const el = rightPanelMode.value === 'print'
      ? pdfPageViewRef.value?.contentRef ?? null
      : markdownRendererRef.value?.markdownRoot ?? null;
    if (!el) throw new Error('预览组件未就绪');

    const { generatePdfBlob } = useExport(el, exportTitle.value);
    const data = await generatePdfBlob();
    if (data?.pageImages) {
      pdfPreviewPages.value = data.pageImages;
      // html2canvas 没有返回 PDF blob，临时用一个 base64 空 blob
      pdfPreviewPdfBase64.value = '';
    }
  } catch (fallbackErr) {
    console.error('[fetchPreview] fallback 失败:', fallbackErr);
    ElMessage.error('预览生成失败：Electron 服务和浏览器方式均不可用');
  } finally {
    pdfPreviewLoading.value = false;
  }
}
```

同时修改 `confirmPdfDownload`，当 fallback 模式且无 `pdfPreviewPdfBase64` 时使用 `useExport` 直接下载：

```typescript
const confirmPdfDownload = async () => {
  if (exportFallbackMode.value && !pdfPreviewPdfBase64.value) {
    // fallback 模式：直接用 useExport 下载
    const el = rightPanelMode.value === 'print'
      ? pdfPageViewRef.value?.contentRef ?? null
      : markdownRendererRef.value?.markdownRoot ?? null;
    if (!el) { ElMessage.error('导出目标未就绪'); return; }
    const { exportToPdf } = useExport(el as HTMLElement, exportTitle.value);
    exportToPdf();
    pdfPreviewVisible.value = false;
    return;
  }
  // 原 Electron 路径...
  if (!pdfPreviewPdfBase64.value) return;
  // ...base64 → blob → download
};
```

---

## Step 3 — 完善 `electron/main.cjs`（可选优化）

当前 Electron 服务直接将前端传入的 HTML 写入文件。无需大改，因为 `buildPdfHtmlDocument` 会把完整 CSS 都内联进去。但如果想进一步复用 `resume-markdown.css` 文件内容，可在 `electron/main.cjs` 中增加 `/api/styles` 接口，前端请求后内联。

此步为可选项，Step 1 的 CSS 内联已足够让 PDF 正确渲染。

---

## 验证流程

1. 启动 `npm run electron:dev`（Electron 微服务）
2. 切换到简历页面，点击"导出 PDF"
3. **验证 A**：`buildPdfHtmlDocument` 无 RuntimeError，预览弹窗出现 Chromium 截图
4. **验证 B**：点击"确认下载"，PDF 文件正常下载，页码 header/footer 正确
5. **验证 C**：停止 Electron 服务，再次点击"导出 PDF"，自动 fallback 到 html2canvas 方式
6. **验证 D**：切换不同主题（blue/dark/minimal/classic/modern），PDF 样式一致

---

## 依赖确认

确保 `pdf-lib` 已安装（`package.json dependencies` 已有）：

```bash
cd ai-interview-frontend && npm install pdf-lib
```

确保 `html2canvas` 和 `jspdf` 已安装（`useExport.ts` 依赖）：

```bash
npm install html2canvas jspdf
```

（通常已存在，如缺失再安装）