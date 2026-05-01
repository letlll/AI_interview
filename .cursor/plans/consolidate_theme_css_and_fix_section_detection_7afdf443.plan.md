---
name: Consolidate theme CSS and fix section detection
overview: Extract theme CSS to a dedicated file and fix autoDetectSectionType to use markdown heading syntax rather than keyword matching. The goal is to eliminate redundant copies of theme colors and ensure the Vue live-preview and Electron PDF paths produce visually identical output.
todos:
  - id: fix-buildPdfHtmlDocument
    content: Replace inline theme CSS in buildPdfHtmlDocument() with getThemeCss() call
    status: pending
  - id: fix-autoDetectSectionType
    content: Refactor autoDetectSectionType to use markdown heading syntax (regex on raw markdown line)
    status: pending
  - id: fix-heading-renderer-call
    content: Update heading renderer call site to pass raw markdown line to autoDetectSectionType
    status: pending
isProject: false
---

## 发现的问题

### 问题 1：`buildPdfHtmlDocument()` 有独立的内联主题 CSS 副本
在 `ResumeGeneratorNew.vue` 第 591–605 行，`buildPdfHtmlDocument()` 硬编码了主题颜色字符串，与 `getThemeCss()` 返回的 CSS **完全不同**（颜色值不同，选择器也不完整）。这导致两个 PDF 生成路径（`markdownToHtml()` vs `buildPdfHtmlDocument()`）的渲染结果可能不一致。

### 问题 2：`autoDetectSectionType()` 使用内容关键词匹配
当前逻辑是纯文本关键词匹配（如 `text.includes('教育')`），而非 markdown 语法感知。如果用户写 `## 校园经历` 或英文标题，识别会失败或出错。

---

## 修改计划

### 1. 让 `buildPdfHtmlDocument()` 复用 `getThemeCss`

**文件:** `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

在 `buildPdfHtmlDocument()` 函数中（第 541–614 行），将第 591–605 行的内联主题 CSS 替换为调用 `getThemeCss(themeClass)`。

**修改前（伪代码）：**

```541:614:ai-interview-frontend/src/views/ResumeGeneratorNew.vue
const buildPdfHtmlDocument = async (...) => {
  // ...
  // 当前：硬编码主题颜色
  '    .theme-blue .resume-name { color: #1a56db; }\n' +
  '    .theme-blue .section-title { color: #1a56db; border-color: #bfdbfe; }\n' +
  // ...
  '    .theme-dark .resume-name { color: #58a6ff; }\n' +
  // ...
```

**修改后：**

```javascript
// 调用已有的 getThemeCss 生成完整主题样式
const themeStyles = getThemeCss(themeClass || 'theme-blue');
```

并在 `style` 标签内拼接 `themeStyles`。

---

### 2. 将 `autoDetectSectionType` 改为基于 Markdown 标题语法识别

**文件:** `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

将函数签名改为接收 `rawLine: string`（原始 markdown 行，如 `## 教育经历`），用正则检测 markdown 标题语法，再对标题文本做关键词匹配。

**修改后的逻辑：**

```typescript
/**
 * 根据 Markdown 标题行的 ## 前缀和标题文本关键词自动识别 section type
 * @param rawLine 原始 markdown 行（如 "## 教育经历" 或 "## Projects"）
 * @returns section type 字符串（如 'education', 'skills', 'summary', 'work', 'projects'），无匹配返回空字符串
 */
function autoDetectSectionType(rawLine: string): string {
  // 匹配 Markdown 标题语法：可选的 # 数量 + 空格 + 标题文本
  const match = rawLine.match(/^#{1,6}\s+(.+)$/);
  if (!match) return '';
  const text = match[1].trim();
  const lower = text.toLowerCase();

  if (lower === '教育' || lower === 'education' || lower === '学历' || lower === '学校教育') return 'education';
  if (lower === '技能' || lower === 'skills' || lower === '技术栈' || lower === '能力' || lower === '专业技能') return 'skills';
  if (lower === '自我评价' || lower === '简介' || lower === 'summary' || lower === 'about' || lower === '自我介绍') return 'summary';
  if (lower === '工作经历' || lower === 'work experience' || lower === '工作' || lower === '实习经历' || lower === '社会实践') return 'work';
  if (lower === '项目经历' || lower === 'projects' || lower === '项目' || lower === '项目经验') return 'projects';
  return '';
}
```

**调用点修改（`markdownToHtml()` 中的 heading renderer，第 1705 行附近）：**

```typescript
// 当前：只传递标题纯文本
const sectionType = autoDetectSectionType(text);
// 修改后：传递原始 markdown 行
const sectionType = autoDetectSectionType(raw);
```

---

## 涉及的修改文件

- `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`
  - 第 1661–1680 行：`autoDetectSectionType` 函数签名和实现
  - 第 541–614 行：`buildPdfHtmlDocument()` 中的内联主题 CSS 替换为 `getThemeCss(themeClass)`
  - 第 1705 行附近：heading renderer 中 `autoDetectSectionType` 的入参从 `text` 改为 `raw`

## 补充说明

`src/utils/resumeThemeCss.ts` **已经是单独的文件**，`getThemeCss` 在第 400 行已被正确导入。本计划只需消除 `buildPdfHtmlDocument()` 中的重复副本，无需新增文件。
