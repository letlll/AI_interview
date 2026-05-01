---
name: Refactor autoDetectSectionType to markdown syntax
overview: 将 `autoDetectSectionType` 从「关键词文本匹配」改为「Markdown 标题层级识别」，同时更新 `ResumeGeneratorNew.vue` 和 `MarkdownRenderer.vue` 两个渲染路径以保持一致。
todos:
  - id: update-autodetect-signature
    content: Update autoDetectSectionType in ResumeGeneratorNew.vue to accept depth param
    status: pending
  - id: update-renderer-resume-gen
    content: Update heading renderer in ResumeGeneratorNew.vue markdownToHtml
    status: pending
  - id: update-renderer-markdown-renderer
    content: Add autoDetectSectionType to MarkdownRenderer.vue
    status: pending
  - id: update-heading-renderer-mdr
    content: Update heading renderer in MarkdownRenderer.vue to use depth-based logic
    status: pending
  - id: simplify-preprocess
    content: Simplify preprocessMarkdown in MarkdownRenderer.vue (optional)
    status: pending
isProject: false
---

## 修改 `autoDetectSectionType` 为 Markdown 语法识别

### 根因

当前 `autoDetectSectionType` 通过中文关键词判断 section 类型（如"教育"→`education`，"技能"→`skills`），这是**内容识别**，且 `MarkdownRenderer.vue` 依赖 `<!-- section:TYPE -->` HTML 注释标记。两个渲染路径行为不一致。

### 新逻辑：基于 Markdown 标题层级

```
H1  (depth===1)  →  resume-name（简历姓名）
H2  (depth===2)  →  section（大模块标题，自动检测）
H3–H6 (depth>=3) →  subsection（子标题，继承父 H2 的 section type）
```

当 `depth >= 2` 时，`autoDetectSectionType(text, depth)` 不再依赖文本关键词，只返回空字符串；真正的 section type 由 `sectionType` 变量（heading 闭包中的状态）维护：

- H2 → 调用 `autoDetectSectionType(text, 2)` 获取 `slug`，设为新的 `sectionType`，同时设置 `data-section-type`
- H3+ → 继承当前 `sectionType`，不更新

---

### 修改 1：`ResumeGeneratorNew.vue` — 更新 `autoDetectSectionType` 和 heading renderer

**文件**: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

**1a. 修改 `autoDetectSectionType` 函数签名，改为接收 `depth` 参数：**

```typescript
/**
 * 根据 Markdown 标题层级自动识别 section type
 * @param text 标题纯文本
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

**1b. 更新 heading renderer（`markdownToHtml` 内的 `heading` 函数）：**

将第 1702–1712 行的逻辑改为：

```typescript
if (depth === 1) return `<h1 class="resume-name">${inner}</h1>\n`;

// H2：自动检测 section type
if (depth === 2) {
  const text = inner.replace(/<[^>]+>/g, '').trim();
  const slug = autoDetectSectionType(text, depth);
  sectionType = slug; // 更新状态，供后续 H3+/list 使用
  const classes = ['section-title', slug ? `section-title--${slug}` : '', `h${depth}`].filter(Boolean).join(' ');
  return `<h${depth} class="${classes}" data-section-type="${slug}">${inner}</h${depth}>\n`;
}

// H3+：继承当前 sectionType，不重新检测
const slug = sectionType ? `section-title--${sectionType}` : '';
const classes = ['section-title', slug, `h${depth}`].filter(Boolean).join(' ');
return `<h${depth} class="${classes}" data-section-type="${sectionType}">${inner}</h${depth}>\n`;
```

---

### 修改 2：`MarkdownRenderer.vue` — 同步更新 heading renderer

**文件**: `ai-interview-frontend/src/components/common/MarkdownRenderer.vue`

**2a. 添加 `autoDetectSectionType` 函数（`currentSectionType` 声明之后）：**

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

将：

```typescript
const slug = currentSectionType ? `section-title--${currentSectionType}` : '';
```

改为：

```typescript
if (depth === 1) {
  return `<h1 class="resume-name" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}">${inner}</h1>\n`;
}
if (depth === 2) {
  const text = plainTitle;
  const slug = autoDetectSectionType(text, depth);
  currentSectionType = slug; // 更新状态
  const slugClass = slug ? `section-title--${slug}` : '';
  const classes = ['section-title', slugClass, `h${depth}`].filter(Boolean).join(' ');
  return `<h${depth} class="${classes}" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}" data-section-type="${slug}">${inner}</h${depth}>\n`;
}
// H3+: inherit
const slugClass = currentSectionType ? `section-title--${currentSectionType}` : '';
const classes = ['section-title', slugClass, `h${depth}`].filter(Boolean).join(' ');
return `<h${depth} class="${classes}" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}" data-section-type="${currentSectionType}">${inner}</h${depth}>\n`;
```

**2c. 简化 `preprocessMarkdown` 函数（可选）**：`<!-- section:TYPE -->` 标记逻辑可以保留作为手动覆盖，但不再依赖它作为唯一检测手段。

---

### 文件清单


| 操作  | 文件路径                                                               |
| --- | ------------------------------------------------------------------ |
| 修改  | `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`           |
| 修改  | `ai-interview-frontend/src/components/common/MarkdownRenderer.vue` |


### 验证方式

渲染以下 Markdown 后，两个路径（`MarkdownRenderer.vue` 预览 + `markdownToHtml` Electron API）应输出一致的 HTML：

- H2 标题带 `data-section-type`，class 包含 `section-title--xxx`
- H3+ 标题 `data-section-type` 继承父 H2 的值
- 列表项 class 正确（`work-item`、`project-item` 等）

