---
name: Inline resume-markdown.css for unified styles
overview: Use Vite's ?raw import to inline resume-markdown.css as a string in ResumeGeneratorNew.vue, then inject it into both buildPdfHtmlDocument and markdownToHtml — so PDF export and Electron preview share the same full CSS variable theme system as the browser Markdown preview.
todos:
  - id: add-raw-import
    content: Add CSS raw import at top of ResumeGeneratorNew.vue script section
    status: pending
  - id: fix-build-pdf
    content: Update buildPdfHtmlDocument to inject resumeMarkdownStyles instead of hardcoded theme rules
    status: pending
  - id: fix-markdown-to-html
    content: Update markdownToHtml to use resumeMarkdownStyles instead of hardcoded themeStyles array
    status: pending
  - id: verify-unified-styles
    content: Verify unified styles work across all three preview paths
    status: pending
isProject: false
---

## 原理

`resume-markdown.css` 定义了完整的 CSS 变量主题系统（`--accent`、`--border-work` 等）。`buildPdfHtmlDocument` 和 `markdownToHtml` 当前只有 15 条硬编码规则，缺少这些变量。通过 Vite 的 `?raw` 语法把 CSS 文件作为字符串导入，然后注入到两个函数的 `<style>` 块中，即可统一样式。

**无需安装任何插件。** Vite 原生支持 `?raw` 后缀，将文件内容作为字符串返回。

---

## 改动 1：在文件顶部添加 CSS 字符串导入

**文件**: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

在 `<script setup lang="ts">` 的所有 `import` 语句之后，找到第一个 `import` 语句（如 `import { ref, ...`），在它**之前**插入一行：

```javascript
import resumeMarkdownStyles from '@/assets/styles/resume-markdown.css?raw';
```

### 具体插入位置

在约第 55 行（第一个 `<script>` 块的 import 区），在第一个 `import` 之前：

```javascript
// === 第 1 步：在此处插入 ===
import resumeMarkdownStyles from '@/assets/styles/resume-markdown.css?raw';
// === 插入完毕 ===

import { ref, computed, watch, nextTick, onMounted, onUnmounted } from 'vue';
```

---

## 改动 2：修改 `buildPdfHtmlDocument` 函数

**位置**: `ResumeGeneratorNew.vue` 第 541–611 行

### 变更策略

- 保留 PDF 打印必需的基础样式（break-inside、table collapse 等）
- **删除**原来的 15 条硬编码主题规则（第 587–601 行）
- **在 `<style>` 末尾、`extraStylesBlock` 之前**，插入 `resumeMarkdownStyles`
- **额外添加** `.resume-document { box-shadow: none !important; }` override（在 resumeMarkdownStyles 之后），防止 PDF 中出现阴影

### new_string（替换整条 return 语句，第 546–611 行）

```546:611:ai-interview-frontend/src/views/ResumeGeneratorNew.vue
  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <style>\n' +
    '    * { box-sizing: border-box; margin: 0; padding: 0; box-shadow: none !important; border-radius: 0 !important; }\n' +
    '    body { width: 794px; background: #ffffff; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, \'Helvetica Neue\', Arial, sans-serif; line-height: 1.75; font-size: 16px; color: #333333; }\n' +
    '    .resume-document { max-width: 800px; margin: 0 auto; padding: 40px; background: #ffffff; }\n' +
    '    .section { margin-bottom: 32px; padding: 16px 0; }\n' +
    '    .section:last-child { margin-bottom: 0; }\n' +
    '    .section-title { font-size: 16px; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 16px 0 10px; }\n' +
    '    .section-title.h1 { font-size: 32px; }\n' +
    '    .section-title.h2 { font-size: 18px; }\n' +
    '    .section-title.h3 { font-size: 16px; }\n' +
    '    .resume-name { font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 12px; }\n' +
    '    .item-list, .skills-list, .summary-list, .work-list, .project-list, .education-list, .custom-list { padding-left: 20px; margin: 0 0 10px; list-style: disc; }\n' +
    '    .skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }\n' +
    '    .skill-item { background: #f0f0f0; padding: 2px 10px; border-radius: 3px; font-size: 13px; }\n' +
    '    .paragraph { margin: 0 0 8px; }\n' +
    '    .table-wrapper { overflow-x: auto; margin-bottom: 10px; }\n' +
    '    .table { width: 100%; border-collapse: collapse; font-size: 13px; }\n' +
    '    .table-cell { padding: 5px 8px; border: 1px solid #ddd; }\n' +
    '    .table-row:nth-child(even) { background: #fafafa; }\n' +
    '    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }\n' +
    '    .inline-code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 13px; }\n' +
    '    .link { color: #2563eb; text-decoration: none; }\n' +
    '    .bold { font-weight: 700; }\n' +
    '    .italic { font-style: italic; }\n' +
    '    .strikethrough { text-decoration: line-through; }\n' +
    '    .image-figure { text-align: center; margin: 10px 0; }\n' +
    '    .image { max-width: 100%; height: auto; }\n' +
    '    .blockquote { border-left: 3px solid #e0e0e0; padding-left: 12px; margin: 0 0 8px; color: #666; font-size: 13px; }\n' +
    '    .section, .subsection, .table-wrapper, table { break-inside: avoid; }\n' +
    '    .work-item, .project-item, .education-item { margin-bottom: 12px; }\n' +
    '    .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }\n' +
    '    .item-title { font-weight: 600; }\n' +
    '    .item-date { font-size: 13px; color: #666; }\n' +
    '    .item-subtitle { font-size: 13px; color: #666; margin-bottom: 4px; }\n' +
    '    .work-list, .project-list, .education-list { list-style: none; padding-left: 0; }\n' +
    '    .work-item, .project-item, .education-item { padding-left: 0; }\n' +
    '    .code-block { background: #f6f8fa; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 13px; }\n' +
    '    code { font-family: \'Consolas\', \'Monaco\', \'Courier New\', monospace; }\n' +
    '  </style>\n' +
    '  <style id="pdf-theme-styles">\n' +
    '    /* 强制屏蔽 resume-markdown.css 中的阴影（PDF 不需要） */\n' +
    '    .resume-document { box-shadow: none !important; }\n' +
    '    /* 注入完整的 CSS 变量主题系统（与 Markdown 预览完全一致） */\n' +
         + resumeMarkdownStyles + '\n' +
    '  </style>\n' +
    '  ' + extraStylesBlock + '\n' +
    '</head>\n' +
    '<body>\n' +
    '  ' + resumeDocHtml + '\n' +
    '</body>\n' +
    '</html>';
```

### 改动说明


| 对比项               | 修改前       | 修改后                                       |
| ----------------- | --------- | ----------------------------------------- |
| 主题样式              | 15 条硬编码规则 | 完整的 `resumeMarkdownStyles`（CSS 变量 + 级联规则） |
| CSS 变量支持          | 无         | 5 个主题的 `--accent`、`--border-work` 等全部支持   |
| `box-shadow`      | 依赖 CSS 文件 | 额外 `!important` 屏蔽，确保 PDF 无阴影             |
| `contenteditable` | 无         | resumeMarkdownStyles 中有，但不影响 PDF          |


---

## 改动 3：修改 `markdownToHtml` 函数

**位置**: `ResumeGeneratorNew.vue` 第 1664–1733 行（当前函数已包含新版本结构）

### 变更策略

- 保留已添加的全局 reset（`* { box-shadow: none !important }`）
- **删除**原有的 `themeStyles` 硬编码数组（第 1665–1681 行）
- **替换 `${themeStyles}**` 为 `resumeMarkdownStyles`
- **删除**中间的硬编码基础样式（h1、.contact、h2、ul、li、.item-header 等，第 1711–1723 行）—— 这些已在 `resumeMarkdownStyles` 中有定义
- **保留** `extraStyles` 拼接和 `body { width: 794px; ... }`（PDF 必需）
- **在 `extraStyles` 之前**，添加 `.resume-document { box-shadow: none !important; }` override

### new_string（替换第 1664–1733 行）

```1664:1733:ai-interview-frontend/src/views/ResumeGeneratorNew.vue
/**
 * Markdown → HTML 转换（用于 Electron API 调用）
 * 输出格式与 Test/sample.js / sample-3pages.js 完全一致：
 * - body 作为 A4 内容容器（width: 794px, padding: 40px），无额外 wrapper
 * - 全局 reset 屏蔽 extraStyles 中的 box-shadow / border-radius / margin 冲突
 * - 主题样式使用与 Markdown 预览相同的 resume-markdown.css（通过 ?raw 导入）
 */
function markdownToHtml(markdown: string, themeClass: string, extraStyles: string): string {
  // Markdown → HTML
  const htmlContent = marked.parse(markdown) as string;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
/* 全局 reset：屏蔽 extraStyles 中的显示属性，防止 PDF 中出现阴影/圆角/冲突边距 */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  box-shadow: none !important;
  border-radius: 0 !important;
  border: none !important;
}
/* A4 内容区（与 Test/sample.js 完全一致） */
body {
  width: 794px;
  margin: 0;
  padding: 40px;
  background: #ffffff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  font-size: 14px;
  line-height: 1.6;
  color: #333333;
}
/* 强制屏蔽 resume-markdown.css 中的阴影 */
.resume-document { box-shadow: none !important; }
/* 注入完整的 CSS 变量主题系统（与 Markdown 预览完全一致） */
${resumeMarkdownStyles}
/* 用户 extraStyles（!important reset 已屏蔽冲突属性，自定义字体/颜色等仍然生效） */
${extraStyles}
</style>
</head>
<body>
${htmlContent}
</body>
</html>`;
}
```

### 改动说明


| 对比项                          | 修改前                       | 修改后                                 |
| ---------------------------- | ------------------------- | ----------------------------------- |
| 主题样式                         | `themeStyles` 数组（15 条硬编码） | `resumeMarkdownStyles`（完整 CSS 变量系统） |
| 基础元素样式                       | 手动定义 h1、.contact、h2 等     | 由 `resumeMarkdownStyles` 提供         |
| theme-dark 完整颜色              | 缺失 `.skill-item` 等        | 完整支持                                |
| theme-minimal                | 只有 2 条规则                  | 完整支持                                |
| theme-classic / theme-modern | 只有 2 条规则                  | 完整支持                                |


---

## 验证方法

1. 修改后，点击"精确预览"刷新按钮
2. 打开 DevTools Network，找到 POST `/api/preview` 请求
3. 检查 Request Payload HTML：
  - `<style>` 中包含 `resume-document.theme-blue { --accent: #409eff; ... }`（CSS 变量）
  - 包含 `.section-title--work { border-bottom-color: #b3e19d; }`（section-type 边框色）
  - 不包含 `box-shadow: 0 2px 12px`（被 `!important` 屏蔽）
4. 对比 Markdown 预览：section 标题边框颜色应一致
5. 切换 theme-dark，全局背景色应与 Markdown 预览一致

