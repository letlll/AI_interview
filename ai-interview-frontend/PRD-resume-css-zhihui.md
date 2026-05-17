## Problem Statement

当前简历 CSS（`resumeMarkdownCss.ts`）存在以下问题：
- 列表项 `.work-item` / `.project-item` 左侧有 3px 彩色竖杠（`border-left`），与正式简历格式不符
- 行高 1.75 过高，内容稀疏
- 标题层级区分不够清晰，缺乏知网论文式的严谨层级结构
- 整体排版偏向博客/CMS 风格，不似求职简历

用户期望 Markdown 渲染出的简历符合知网（GB/T 7713）论文规范，呈现专业、正式、打印友好的商务风格。

## Solution

重写 `resumeMarkdownCss.ts` 的基础结构样式（section 容器、列表、标题层级、表格），保持现有 5 个彩色主题（CSS 变量）不变。

### 字体系统

| 场景 | 字体 |
|------|------|
| 标题 `#` `##` `###` `####` | 黑体 SimHei |
| 正文 | 宋体 SimSun |
| 英文/数字（全局） | Times New Roman |

### 五级层级（Markdown → 简历语义 → 知网规范）

| 层级 | Markdown | 简历语义 | 字体 | 字号 | 字重 | 段前/段后 | 特殊 |
|------|----------|---------|------|------|------|-----------|------|
| 论文题 | `# 姓名` | 简历标题 | 黑体 | 22px | 700 | — | 居中 |
| 一级 | `## 模块名` | 章节标题 | 黑体 | 15px | 700 | 24px / 12px | 无下划线 |
| 二级 | `### 项目名 \| 日期` | 项目标题 | 黑体 | 14px | 700 | 18px / 8px | `\|` 右侧日期右对齐 12px 灰色 |
| 三级 | `#### 子标题` | 项目内子项 | 黑体 | 13px | 700 | 12px / 6px | — |
| 正文 | `- **key**：value` | 正文条目 | 宋体+TNR | 14px | 400 | 行高 1.5 | `list-style: disc` 缩进 1.5em |

### 二级标题日期解析

`### 智能医疗：定时提醒自动给药器设计 | 2024.05-2025.05`

前端自动拆解 `|` 分隔符：
- 左侧：项目标题，加粗 14px 黑体
- 右侧：日期，常规 12px 灰色，右对齐

### 其他元素规范

| 元素 | 规范 |
|------|------|
| 表格 | 知网三线表：顶线 1.5px / 表头下线 0.75px / 底线 1.5px，无竖线，无背景色 |
| 有序列表 `1.` | 浏览器默认编号，同正文字号 |
| `|` 管道符 | 无特殊格式，普通文本 |
| `**key**：` | Markdown 默认加粗 |
| 正文行高 | 1.5 |
| 正文缩进 | `padding-left: 1.5em`，圆点 `list-style: disc` |

### 颜色

纯商务黑白灰：`#333` 主文字 / `#666` 次要 / `#999` 辅助。现有 5 个彩色主题的 CSS 变量保留，仅修改基础结构规则。

### 去掉的样式

- `.work-item` / `.project-item` / `.education-item` 的 `border-left: 3px solid` 竖杠
- `:hover` 彩色边框变化效果
- `.section-title` 的 `border-bottom` 彩色装饰线

## User Stories

1. 作为求职者，我希望简历排版符合知网论文规范，让 HR 阅读时感受到专业和正式
2. 作为求职者，我只需用标准 Markdown 语法（# ## ### - **）就能写出排版精美的简历
3. 作为求职者，我希望项目标题中的日期自动右对齐显示，无需手动排版
4. 作为求职者，我希望正文行高紧凑但不拥挤（1.5），信息密度合理
5. 作为求职者，我希望表格呈现三线表格式，清晰专业
6. 作为求职者，我希望标题层级用黑体字号区分，不改颜色也能一眼识别层级
7. 作为求职者，我希望预览和导出的 PDF 视觉效果完全一致

## Implementation Decisions

### MarkdownRenderer 改动

`MarkdownRenderer.vue` 中的 marked 渲染器需新增 `###` 日期拆解逻辑：
- 检测 `###` 标题内容是否包含 `|`
- 若包含，拆分为：左侧标题（加粗）+ 右侧日期（右对齐、灰色、Times New Roman）
- 若不含，按普通黑体 14px 标题渲染

### 修改模块

| 模块 | 类型 | 说明 |
|------|------|------|
| `src/styles/resumeMarkdownCss.ts` | 修改 | 重写基础结构 CSS（1-14 节），保留颜色变量 |
| `src/composables/useResumeRenderer.ts` | 修改 | 更新 marked renderer：`###` 日期拆解、表格三线表 |
| `src/views/ResumeGeneratorNew.vue` | 修改 | `markdownToHtml()` 的 markdown 解析同步更新 |

### 不改

- `RESUME_CSS` 末尾的 5 个彩色主题 CSS 变量（`.resume-document.theme-blue` 等）——保留不动
- Electron 端 `/api/preview` ——不改
- PDF 渲染管道 ——不改

## Testing Decisions

- 用示例简历 Markdown 文本作为 fixture，验证生成的 HTML 包含正确的 CSS class 和层级结构
- 验证表格渲染为三线表（`<table>` 带有正确 border 属性）
- 验证 `###` 标题的日期拆解：同时包含 `|` 生成右侧日期元素，不含则普通渲染

## Out of Scope

- 彩色主题颜色修改
- Electron /api/preview 后端修改
- PDF.js 渲染管道
- 非简历页面的样式

## Further Notes

- `###` 日期拆解逻辑需同时应用于 `useResumeRenderer.ts`（Markdown 预览）和 `ResumeGeneratorNew.vue` 的 `markdownToHtml()`（PDF 导出）
- 三线表样式需兼容 Electron Chromium 的 printToPDF（内联 CSS 无变量依赖）
