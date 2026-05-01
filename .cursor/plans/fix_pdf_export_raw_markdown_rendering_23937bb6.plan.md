---
name: Fix PDF export raw Markdown rendering
overview: 修复 PDF 导出时传入原始 Markdown 而非 HTML 的问题。核心方案：(1) 在 getExportInnerHtml 中检测并拒绝 raw Markdown，(2) 优先强制使用 PdfPageView 的已解析 HTML，(3) 清理 fetchPreview 中的重复代码。
todos: []
isProject: false
---

## 问题根因确认

### 终端日志解码

```
前端 POST 长度: 4636 bytes
[DEBUG] bodyTextLength: 2061
[DEBUG] hasResumeDoc: true
[DEBUG] bodyScrollHeight: 1123 (= 1 个 A4 页高，内容恰好填满 1 页)
```

`bodyTextLength: 2061` 是 Chromium DOM 中的纯文本字符数。如果 content 是正常渲染的 HTML（10 个 section），textContent 应有 4000+ 字符。2061 说明 **传入 Electron 的 HTML 中大部分是 Markdown 语法字符**（`*`, `#`, `|`, `-` 等），被当作纯文本渲染，没有被 HTML 标签包裹。

### 根本原因

`markdownRoot.innerHTML` 在 `getExportInnerHtml()` 被调用时，内容可能还未经过完整的 `postProcessSections` DOM 操作（该操作将裸的 `h1`/`h2` 标签包装为 `section.section--*` 结构）。某些竞态条件下，raw Markdown 文本被直接读入了 innerHTML。

---

## 修复计划

### 修复 1：检测 raw Markdown 并重新解析（防御性修复）

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 541 行 `getExportInnerHtml` 函数末尾 return 前

在返回前增加 content type 检测。如果 innerHTML 以 Markdown 标记开头（`#`, `*`, `-`, `|` 等），说明拿到了 raw Markdown，需要重新用 marked 解析：

```javascript
// 在 return '' 之前，加入：
// 内容合理性检查：如果 innerHTML 以 Markdown 语法开头，说明拿到了 raw Markdown
const mdPatterns = /^[\s]*[#*_~`>-]/;
if (mdHtml && mdPatterns.test(mdHtml)) {
  console.warn('[getExportInnerHtml] ⚠️ 检测到 markdownRoot 内容为 raw Markdown，长度:', mdHtml.length, '前 50:', mdHtml.substring(0, 50));
  // 重新解析 Markdown → HTML
  try {
    const { Marked } = require('marked');
    const md2html = new Marked().parse(mdHtml);
    if (md2html && md2html.trim()) {
      console.log('[getExportInnerHtml] ✓ 重新解析为 HTML，长度:', md2html.length);
      return md2html;
    }
  } catch (e) { console.error('[getExportInnerHtml] 重新解析失败:', e); }
}
```

**或者更简单的方案**：直接 fallback 到 PdfPageView 的 `contentRef.innerHTML`（该值经过 marked 解析，一定是 HTML）：

```javascript
// 当 markdownRoot 返回的内容有问题时，强制使用 PdfPageView
if (mdHtml && !mdHtml.includes('<div') && !mdHtml.includes('<h') && !mdHtml.includes('<p')) {
  console.warn('[getExportInnerHtml] ⚠️ markdownRoot 内容异常（非 HTML），改用 printContentRoot');
  if (printHtml) return printHtml;
}
```

---

### 修复 2：优先使用 PdfPageView（最可靠的 HTML 来源）

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 503-541 行

**策略**：对于导出操作，**始终使用 PdfPageView 的 contentRef.innerHTML**，因为：

- `contentRef` 只用于内容测量，渲染逻辑与 MarkdownRenderer 完全一致（使用相同的 marked 实例和 renderer）
- `contentRef.innerHTML` 是 `marked.parse()` 的直接输出，一定是 HTML
- 不受 Vue component lifecycle / v-if / destroy-on-close 影响

```javascript
const getExportInnerHtml = (): string => {
  const unwrapMaybeRef = <T>(v: T | { value: T } | null | undefined): T | undefined => {
    if (v && typeof v === 'object' && 'value' in v) return (v as { value: T }).value;
    return v as T | undefined;
  };

  // 导出时优先使用 PdfPageView（经过 marked 解析的 HTML，最可靠）
  const printContentRoot = unwrapMaybeRef<HTMLElement | null>(pdfPageViewRef.value?.contentRef) ?? undefined;
  const printHtml = printContentRoot?.innerHTML?.trim() || '';

  if (printHtml) {
    console.log('[getExportInnerHtml] → 使用 printContentRoot(PdfPageView)，长度:', printHtml.length);
    return printHtml;
  }

  // fallback 到 MarkdownRenderer（当 PdfPageView 未激活时）
  const markdownRoot = unwrapMaybeRef<HTMLElement | null>(markdownRendererRef.value?.markdownRoot) ?? undefined;
  const mdHtml = markdownRoot?.innerHTML?.trim() || '';

  if (mdHtml) {
    // 内容合理性检查：确保拿到了 HTML 而非 raw Markdown
    const isLikelyHtml = mdHtml.includes('<div') || mdHtml.includes('<h1') || mdHtml.includes('<h2') || mdHtml.includes('<p');
    if (!isLikelyHtml) {
      console.warn('[getExportInnerHtml] ⚠️ markdownRoot 内容异常（非 HTML），强制等待 PdfPageView');
      return '';  // 触发 waitForContentReady 重试，最终等 PdfPageView 就绪
    }
    console.log('[getExportInnerHtml] → 使用 markdownRoot，长度:', mdHtml.length);
    return mdHtml;
  }

  console.warn('[getExportInnerHtml] 无可用渲染内容');
  return '';
};
```

---

### 修复 3：清理 fetchPreview 中的重复代码

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 670-684 行

当前 `buildPdfHtmlDocument` 被调用了两次（`html` 变量重复声明）。删除重复的行：

```javascript
// 删除第 682-684 行的重复代码：
// const html = buildPdfHtmlDocument(innerHtml, resumeThemeClass.value);
// console.log('[fetchPreview] 生成的 HTML 文档长度:', html?.length, ...);
// （保留 try 块中第 689 行的唯一调用）
```

---

## 修改文件汇总


| 序号  | 文件                                   | 关键修改                                              |
| --- | ------------------------------------ | ------------------------------------------------- |
| 1   | `ResumeGeneratorNew.vue` 第 503-541 行 | `getExportInnerHtml` 优先用 PdfPageView，加 HTML 合理性检测 |
| 2   | `ResumeGeneratorNew.vue` 第 670-684 行 | 删除 `buildPdfHtmlDocument` 重复调用                    |


---

## 验证步骤

1. 保存修改后，切换到 **打印预览** 模式
2. 点击**导出 PDF**，观察控制台：
  - `[getExportInnerHtml] → 使用 printContentRoot(PdfPageView)` → 说明 PdfPageView 路径生效
  - `bodyTextLength` 在 Electron 端显著增大（4000+）→ 内容正常
3. 如果仍有问题，切换到 **Markdown 预览** 模式，重复步骤 2，观察 fallback 到 MarkdownRenderer 时是否有警告
4. 确认 PDF 预览弹窗中显示的内容是正确的渲染 HTML（而非原始 Markdown 语法）

