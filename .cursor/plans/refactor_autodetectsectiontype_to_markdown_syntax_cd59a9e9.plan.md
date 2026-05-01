---
name: Refactor autoDetectSectionType to markdown syntax + H1-H6 per-level colors
overview: 将 `autoDetectSectionType` 改为 Markdown 语法（深度优先 + 文本关键词辅助）识别，并为 H1-H6 每一级标题配置独立配色（通过 CSS 变量）。
todos:
  - id: update-autodetect-signature
    content: "ResumeGeneratorNew.vue: 更新 autoDetectSectionType 为 depth+text 混合识别"
    status: pending
  - id: update-renderer-resume-gen
    content: "ResumeGeneratorNew.vue: 更新 markdownToHtml 的 heading renderer"
    status: pending
  - id: add-autodetect-to-mdr
    content: "MarkdownRenderer.vue: 添加 autoDetectSectionType 并更新 heading renderer"
    status: pending
  - id: update-heading-css-vars
    content: "resume-markdown.css: 为每个主题添加 h1-h6 的 CSS 变量（颜色 + 边框样式）"
    status: pending
  - id: update-heading-selectors
    content: "resume-markdown.css: 更新 h1-h6 选择器使用对应 CSS 变量"
    status: pending
isProject: false
---

## 修改 `autoDetectSectionType` 为 Markdown 语法识别

### 根因

当前 `autoDetectSectionType` 完全依赖中文关键词文本匹配（如"教育"→`education`），没有任何 Markdown 结构感知。目标是改为**深度优先（H2 检测文本） + 文本关键词辅助**的混合识别，同时让 H1-H6 每一级标题有独立的配色。

### 新识别策略：深度 + 文本关键词混合

```
H1 (depth===1) → resume-name（简历姓名，无 section type）
H2 (depth===2) → 检测文本关键词获取 section type（education/work/projects/skills/summary）
H3–H6 (depth>=3) → 继承父 H2 的 section type，不重新检测文本
```

逻辑：

- 只有 `depth === 2` 才调用文本关键词匹配，命中则返回对应 type
- `depth !== 2` 时返回 `''`，section type 由闭包变量维护（H3+ 继承）
- 若 H2 标题无任何关键词匹配，`sectionType` 仍更新为空字符串（后续内容不应用特殊样式）

---

### 修改 1：`ResumeGeneratorNew.vue` — 更新 `autoDetectSectionType` 和 heading renderer

**文件**: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

**1a. 修改 `autoDetectSectionType` 函数（第 1661–1680 行）：**

```typescript
/**
 * 根据 Markdown 标题层级自动识别 section type
 * @param text 标题纯文本（已去除 HTML 标签）
 * @param depth 标题层级（1–6）
 * @returns section type 字符串；非 H2 标题返回空字符串（由闭包状态管理）
 */
function autoDetectSectionType(text: string, depth: number): string {
  if (depth !== 2) return ''; // 只有 H2 才确定 section type，H3+ 由闭包继承
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower.includes('教育') || lower.includes('学校') || lower.includes('学历')) return 'education';
  if (lower.includes('技能') || lower.includes('技术') || lower.includes('能力') || lower.includes('证书')) return 'skills';
  if (lower.includes('评价') || lower.includes('简介') || lower.includes('关于') || lower.includes('自我介绍') || lower.includes('求职')) return 'summary';
  if (lower.includes('工作') || lower.includes('实习') || lower.includes('社会实践')) return 'work';
  if (lower.includes('项目') || lower.includes('设计') || lower.includes('系统') || lower.includes('竞赛') || lower.includes('大赛') || lower.includes('作品') || lower.includes('平台')) return 'projects';
  return '';
}
```

**1b. 更新 heading renderer（第 1698–1712 行）：**

将第 1702–1712 行的逻辑改为：

```typescript
if (depth === 1) return `<h1 class="resume-name">${inner}</h1>\n`;

// H2：调用 depth+text 混合检测
if (depth === 2) {
  const text = inner.replace(/<[^>]+>/g, '').trim();
  const slug = autoDetectSectionType(text, depth);
  sectionType = slug; // 同步状态，供后续 H3+/list 使用
  const classes = ['section-title', slug ? `section-title--${slug}` : '', `h${depth}`].filter(Boolean).join(' ');
  return `<h${depth} class="${classes}" data-section-type="${slug}">${inner}</h${depth}>\n`;
}

// H3+：继承当前 sectionType，不重新检测
const slug = sectionType ? `section-title--${sectionType}` : '';
const classes = ['section-title', slug, `h${depth}`].filter(Boolean).join(' ');
return `<h${depth} class="${classes}" data-section-type="${sectionType}">${inner}</h${depth}>\n`;
```

---

### 修改 2：`MarkdownRenderer.vue` — 同步更新

**文件**: `ai-interview-frontend/src/components/common/MarkdownRenderer.vue`

**2a. 添加 `autoDetectSectionType` 函数（`currentSectionType` 声明之后，约第 34 行后）：**

```typescript
/**
 * 根据 Markdown 标题层级自动识别 section type
 * 只有 H2 才执行文本检测，H3+ 由闭包继承父 section type
 */
function autoDetectSectionType(text: string, depth: number): string {
  if (depth !== 2) return '';
  if (!text) return '';
  const lower = text.toLowerCase();
  if (lower.includes('教育') || lower.includes('学校') || lower.includes('学历')) return 'education';
  if (lower.includes('技能') || lower.includes('技术') || lower.includes('能力') || lower.includes('证书')) return 'skills';
  if (lower.includes('评价') || lower.includes('简介') || lower.includes('关于') || lower.includes('自我介绍') || lower.includes('求职')) return 'summary';
  if (lower.includes('工作') || lower.includes('实习') || lower.includes('社会实践')) return 'work';
  if (lower.includes('项目') || lower.includes('设计') || lower.includes('系统') || lower.includes('竞赛') || lower.includes('大赛') || lower.includes('作品') || lower.includes('平台')) return 'projects';
  return '';
}
```

**2b. 更新 heading renderer（第 52–62 行）：**

```typescript
if (depth === 1) {
  return `<h1 class="resume-name" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}">${inner}</h1>\n`;
}
if (depth === 2) {
  const text = plainTitle;
  const slug = autoDetectSectionType(text, depth);
  currentSectionType = slug;
  const slugClass = slug ? `section-title--${slug}` : '';
  const classes = ['section-title', slugClass, `h${depth}`].filter(Boolean).join(' ');
  return `<h${depth} class="${classes}" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}" data-section-type="${slug}">${inner}</h${depth}>\n`;
}
// H3+: inherit
const slugClass = currentSectionType ? `section-title--${currentSectionType}` : '';
const classes = ['section-title', slugClass, `h${depth}`].filter(Boolean).join(' ');
return `<h${depth} class="${classes}" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}" data-section-type="${currentSectionType}">${inner}</h${depth}>\n`;
```

---

### 修改 3：`resume-markdown.css` — H1-H6 每级独立配色（CSS 变量）

**文件**: `ai-interview-frontend/src/assets/styles/resume-markdown.css`

**设计原则**：

- 每个主题（`theme-blue`、`theme-dark`、`theme-minimal`、`theme-classic`、`theme-modern`）内定义 H1-H6 各自的主色、边框色、字体大小
- 变量命名：`--h1-color`、`--h2-color`、`--h3-color` 等，以及 `--h2-border-color`（底部边框颜色按 section type 区分）
- 颜色从深到浅递减（H1 最深，H6 最浅），形成视觉层级

**3a. 在 `resume-markdown.css` 末尾添加各主题的 H1-H6 CSS 变量定义：**

在 `/* 主题：专业蓝（默认）*/` `.resume-document.theme-blue {}` 块中补充：

```css
/* 主题：专业蓝 */
.resume-document.theme-blue {
  --accent: #409eff;
  --accent-light: #66b1ff;
  --text-primary: #1f1f1f;
  --text-secondary: #666666;
  --text-muted: #999999;
  --bg: #ffffff;
  --border: #e8e8e8;
  --hover-bg: #f5f7fa;
  --focus-bg: #ecf5ff;
  --tag-bg: #f0f2f5;
  --border-work: #b3e19d;
  --border-projects: #f4d03f;
  --border-education: #8cc5ff;
  --border-custom: #e8e8e8;
  /* H1-H6 层级颜色 */
  --h1-color: #1a1a1a;
  --h2-color: #1f1f1f;
  --h3-color: #333333;
  --h4-color: #555555;
  --h5-color: #666666;
  --h6-color: #888888;
  --h2-border-color: #e8e8e8;
}
```

同理为 `theme-dark`、`theme-minimal`、`theme-classic`、`theme-modern` 添加对应变量。

**3b. 更新底部 h1-h6 选择器（`resume-markdown.css` 第 668–672 行附近）：**

将当前：

```css
.resume-document h1 { color: var(--text-primary); border-bottom-color: var(--accent); }
.resume-document h2 { color: var(--text-primary); border-bottom-color: var(--border); }
```

改为：

```css
.resume-document h1 { color: var(--h1-color); border-bottom-color: var(--accent); }
.resume-document h2 { color: var(--h2-color); border-bottom-color: var(--h2-border-color); }
.resume-document h3 { color: var(--h3-color); }
.resume-document h4 { color: var(--h4-color); }
.resume-document h5 { color: var(--h5-color); }
.resume-document h6 { color: var(--h6-color); }
```

**3c. 可选：为各 section type 标题定义 `--h2-border-color` 覆盖**（在主题变量块内，每个 `section-title--xxx` 选择器可以设置 `--h2-border-color`，再由 h2 选择器使用）。

---

### 文件清单


| 操作  | 文件路径                                                               |
| --- | ------------------------------------------------------------------ |
| 修改  | `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`           |
| 修改  | `ai-interview-frontend/src/components/common/MarkdownRenderer.vue` |
| 修改  | `ai-interview-frontend/src/assets/styles/resume-markdown.css`      |


### 验证方式

渲染以下 Markdown 后，两个路径应输出一致且符合预期的 HTML：

- `## 教育背景` → H2 带 `data-section-type="education"` 和 `section-title--education`
- `## 工作经历` → H2 带 `data-section-type="work"`
- `### 项目一`（位于教育 section 下）→ 继承 `data-section-type="education"`
- H1-H6 在各主题下颜色依次递减（可用浏览器 DevTools 检查）

