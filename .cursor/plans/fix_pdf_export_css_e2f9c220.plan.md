---
name: Fix PDF export CSS
overview: "Fix PDF export so styles are applied correctly. Root causes: (1) HTML class names don't match CSS selectors (e.g. info-item vs basic-info-item), (2) buildPdfHtmlDocument injects CSS but innerHTML structure is inconsistent with CSS, (3) markdownToHtml function is dead code never called."
todos:
  - id: fix-build-pdf-use-markdown-to-html
    content: 改动1：修复 buildPdfHtmlDocument 使用 markdownToHtml 路径
    status: pending
  - id: fix-fetch-preview-raw-markdown
    content: 改动2：修改 fetchPreview 传入原始 markdown 而不是 innerHTML
    status: pending
  - id: fix-css-add-custom-structure
    content: 改动3：在 resume-markdown.css 添加自定义 HTML 结构样式
    status: pending
  - id: fix-markdown-to-html-wrapper
    content: 改动4：删除或修复 markdownToHtml 中的额外 body 包装（避免双层 html 文档）
    status: pending
  - id: verify-pdf-styles
    content: 验证：确认 PDF 导出样式与 Markdown 预览一致
    status: pending
isProject: false
---

## 问题诊断

### 根本原因 1：HTML class 名与 CSS 选择器不匹配

`getExportInnerHtml()` 返回的 HTML 中使用的是 AI 生成的 class（如 `.resume-basic-info`、`.info-item`、`.label`、`.value`），但 `resume-markdown.css` 中定义的是完全不同的选择器（`.basic-info-block`、`.basic-info-item`）。

### 根本原因 2：`markdownToHtml` 是死代码从未被调用

当前 PDF 导出流程：`fetchPreview` → `buildPdfHtmlDocument(getExportInnerHtml())` → 发送到 Electron API。
但 `markdownToHtml` 函数从未被调用——它是一个独立的 Markdown→HTML 路径。

### 根本原因 3：全局 `*` reset 屏蔽了所有样式

`buildPdfHtmlDocument` 中的 `* { box-shadow: none !important; border-radius: 0 !important; border: none !important; }` 是对的，但问题在于 CSS 规则根本覆盖不到 HTML 中的 class。

## 解决方案

**核心思路**：修改 PDF 导出流程，使用 `markdownToHtml` 路径（而不是直接取 DOM innerHTML），确保 HTML 结构与 CSS 选择器完全匹配。

### 改动 1：修复 `buildPdfHtmlDocument` — 改用 `markdownToHtml` 路径

**文件**: `ResumeGeneratorNew.vue` 第 538–569 行

将 `buildPdfHtmlDocument` 改为：传入原始 markdown 内容，调用 `markdownToHtml` 生成 HTML（这样 HTML 结构和 CSS 选择器完全匹配），再包装成完整 HTML 文档。

**new_string**:

```538:569:ai-interview-frontend/src/views/ResumeGeneratorNew.vue
/**
 * 构建 PDF 导出的完整 HTML 文档
 * 策略：使用 markdownToHtml 路径确保 HTML 结构与 CSS 选择器完全匹配
 * 然后将生成的 HTML 嵌入一个包含完整样式系统的文档壳
 */
const buildPdfHtmlDocument = (markdownContent: string, themeClass: string): string => {
  // 用 markdownToHtml 生成 HTML（与 Electron 后端一致的路径）
  // markdownToHtml 已经包含完整的 resumeMarkdownStyles
  const bodyHtml = markdownToHtml(markdownContent, themeClass, extraStyles.value ?? '');

  // 将 body 内容解析出来（去掉外层 <!DOCTYPE...><body> 和 </body></html>）
  // markdownToHtml 返回: <!DOCTYPE html><html><head>...</head><body>HTML_CONTENT</body></html>
  // 我们需要提取 HTML_CONTENT 并重新包装
  const bodyMatch = bodyHtml.match(/<body>([\s\S]*)<\/body>/);
  const htmlContent = bodyMatch ? bodyMatch[1] : bodyHtml;

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Resume PDF Export</title>
</head>
<body class="pdf-export-body">
  ${htmlContent}
</body>
</html>`;
};
```

### 改动 2：修改 `fetchPreview` — 传入原始 markdown 而不是 innerHTML

**文件**: `ResumeGeneratorNew.vue` 第 618–644 行

当前 `fetchPreview` 调用 `buildPdfHtmlDocument(innerHtml, resumeThemeClass.value)`，其中 `innerHtml = getExportInnerHtml()` 是 DOM 的 `innerHTML`。

修改为传入原始 markdown 内容，这样 `buildPdfHtmlDocument` 可以用 `markdownToHtml` 重新生成结构正确的 HTML。

**new_string**:

```618:629:ai-interview-frontend/src/views/ResumeGeneratorNew.vue
/** 通过 Electron /api/preview 生成预览（单次请求，返回预览图 + PDF blob） */
const fetchPreview = async () => {
  // 使用原始 markdown 内容（来自 resumeData.content）而不是 DOM innerHTML
  // 这样 buildPdfHtmlDocument 可以通过 markdownToHtml 生成结构正确的 HTML
  const markdownContent = resumeData.value?.content ?? '';
  if (!markdownContent?.trim()) {
    ElMessage.warning('无法获取渲染内容，请先切换到 Markdown 或打印预览模式，等待内容加载完成后重试');
    pdfPreviewLoading.value = false;
    return;
  }

  pdfPreviewLoadingText.value = '正在通过 Chromium 生成高质量预览...';

  try {
    const html = buildPdfHtmlDocument(markdownContent, resumeThemeClass.value);
```

### 改动 3：验证 `markdownToHtml` 正确生成 HTML 结构

确保 `markdownToHtml`（第 1622 行）正确处理 markdown 并输出与 CSS 匹配的结构。检查标记渲染器中的选择器与 `resume-markdown.css` 是否一致：

- 列表：`item-list`（CSS 有定义）✓
- 技能列表：`skills-list`（CSS 有定义）✓  
- 列表项：`item`（CSS 有定义）✓
- 段落：`.paragraph`（CSS 有定义）✓
- 标题：`resume-name`, `section-title`（CSS 有定义）✓

**如果 Markdown 中有 AI 生成的自定义 HTML 块**（如 `resume-basic-info`），这些需要通过额外处理——要么统一 class 名，要么在 CSS 中添加对应规则。

### 改动 4：在 `resume-markdown.css` 中添加对自定义结构的样式覆盖

如果 AI 生成的 Markdown 包含 `resume-basic-info`、`info-item`、`label`、`.value` 等 class，需要在 CSS 中添加对应规则确保 PDF 也有样式。

在 `resume-markdown.css` 末尾添加：

```css
/* ============================================
   AI 生成简历中常见的自定义 HTML 结构
   （确保 PDF 导出一致性）
   ============================================ */

/* 基本信息网格 */
.resume-basic-info {
  display: flex;
  flex-wrap: wrap;
  gap: 12px 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  align-items: center;
  flex: 0 0 auto;
}

.label {
  font-weight: 600;
  color: #2c3e50;
  margin-right: 6px;
  min-width: 40px;
}

.value {
  color: #34495e;
}

.value a {
  color: #2980b9;
  text-decoration: none;
}

/* 通用 section 包装 */
.resume-section {
  margin-bottom: 32px;
}
```

## 验证步骤

1. 修改后，点击"精确预览"刷新按钮
2. 打开 DevTools Network，找到 POST `/api/preview` 请求
3. 检查 Request Payload 中的 HTML：
  - `<body>` 内包含 `class="resume-document theme-blue"`
  - 列表元素有 `class="item-list"` 或 `class="skills-list"`
  - 不再有 `resume-basic-info`、`info-item` 等不匹配的结构
4. 对比 Test/test-pdf-api.html 加载 sample.js 的效果
5. PDF 导出应有与 Markdown 预览一致的样式

