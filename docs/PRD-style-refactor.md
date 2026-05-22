# PRD：前端样式系统 Claude Design 规范化

## Problem Statement

当前前端样式系统存在以下问题：

1. **颜色硬编码泛滥** — element.scss、app.scss、Vue 组件中到处是 hex 值，且存在两套命名体系（`--next-*` 和 `--color-*`），DESIGN.md 定义的 `--color-*` 变量未被引用
2. **element.scss 大面积重复** — 1037 行文件中后半部分（第 683-1037 行）几乎是前半部分的完整复制，按钮样式定义两次且颜色存在冲突（`.el-button--default` color 一次为 `#f5f4ed` 不可见，另一次为 `#4d4c48` 正确）
3. **暗色模式残留** — dark.scss 及其引用不需要，徒增维护复杂度
4. **字体层级缺失** — 缺少 DESIGN.md 规定的 Typography Scale（完整 14 级字号/字重/行高），body 字号偏小（14px vs 标准 16px），行高未设，且缺失 Body Serif（编辑性正文衬线）、Code（等宽代码）、Feature Title、Overline、Micro 等级别
5. **间距未对齐 8px base scale** — 大量 15px 等非标准间距值
6. **Vue 组件内联样式/硬编码色值** — 约 55 个 .vue 文件中散落硬编码 hex 和内联 style，未使用 SCSS 变量体系

## Solution

严格以 DESIGN.md（Claude Anthropic Design System）为唯一设计标准，重构样式系统：

- 建立以 `--color-*` 为唯一底层 token 的 CSS 变量层
- 去重并校正 element.scss 所有组件样式
- 引入完整 Typography Scale（Serif for headlines, Sans for UI）
- 间距/圆角对齐 8px base scale
- 删除暗色模式
- 所有 Vue 组件改为 `<style lang="scss">` 并引用全局变量

## User Stories

1. As a 前端开发者，我希望所有颜色通过 CSS 变量引用而非硬编码 hex，以便更换主题时只需修改变量层
2. As a 前端开发者，我希望 element.scss 没有重复定义和冲突值，以便维护时不会改漏
3. As a 前端开发者，我希望字体层级有明确的 class 可用（如 `.text-display`, `.text-body`），以便组件开发时直接使用而非每次手写 font-size
4. As a 用户，我希望看到一致的 Warm Sand / Terracotta 品牌色体验，而不是不同页面颜色不一致
5. As a 用户，我希望正文字号舒适（16px, line-height 1.60），长时间阅读不疲劳
6. As a 用户，我希望看到 Serif 标题 + Sans 正文的文学感排版层次
7. As a 前端开发者，我希望 Vue 组件 style 块统一使用 SCSS 变量，不出现 magic number/color
8. As a 前端开发者，我希望暗色模式代码干净移除，不残留无效 CSS

## Implementation Decisions

### 1. CSS 变量架构

**两层体系，`--color-*` 为唯一颜色来源：**

- **Token 层 (`--color-*`)**：按 DESIGN.md 定义的颜色名（Parchment、Ivory、Terracotta、Coral 等），只存 hex 值，不做语义映射
- **应用层 (`--next-*` / `--el-*`)**：全部改为 `var(--color-xxx)` 引用，不再存 hex 值

所有新颜色变量统一在 app.scss `:root` 中定义，element.scss 中不再定义新颜色变量。

### 2. element.scss 去重策略

- 以后半部分（第 683-1037 行，即"第二版"）为骨架保留
- 删除前半部分的重复块（第 683-1037 行之前的按钮、输入框、卡片、表格等定义）
- 逐条按 DESIGN.md 校正颜色、阴影、圆角
- 所有硬编码 hex 替换为 `var(--color-xxx)`
- `.el-button--default` 的 `color` 修正为 `var(--color-charcoal-warm)` (#4d4c48)
- `.el-button--white` 的 `color` 修正为 `var(--color-near-black)` (#141413)
- `.el-button--primary` 的 `color` 修正为 `var(--color-ivory)` (#faf9f5)

### 3. Typography Scale

在 app.scss 中新增完整的 14 级字体类，覆盖 Element Plus 的 `--el-font-size-*` 变量：

| # | 级别 | 类名 | 字体 | 字号 | 字重 | 行高 | Letter-Spacing |
|---|------|------|------|------|------|------|----------------|
| 1 | Display / Hero | `.text-display` | Serif (Georgia) | 64px | 500 | 1.10 | normal |
| 2 | Section Heading | `.text-section-heading` | Serif | 52px | 500 | 1.20 | normal |
| 3 | Sub-heading Large | `.text-subheading-lg` | Serif | 36px | 500 | 1.30 | normal |
| 4 | Sub-heading | `.text-subheading` | Serif | 32px | 500 | 1.10 | normal |
| 5 | Sub-heading Small | `.text-subheading-sm` | Serif | 25px | 500 | 1.20 | normal |
| 6 | Feature Title | `.text-feature-title` | Serif | 20.8px | 500 | 1.20 | normal |
| 7 | Body Serif | `.text-body-serif` | Serif | 17px | 400 | 1.60 | normal |
| 8 | Body Large | `.text-body-lg` | Sans (Arial) | 20px | 400 | 1.60 | normal |
| 9 | Body Standard | `.text-body` | Sans | 16px | 400 | 1.60 | normal |
| 10 | Body Small | `.text-body-sm` | Sans | 15px | 400 | 1.60 | normal |
| 11 | Caption | `.text-caption` | Sans | 14px | 400 | 1.43 | normal |
| 12 | Label | `.text-label` | Sans | 12px | 500 | 1.60 | 0.12px |
| 13 | Overline | `.text-overline` | Sans | 10px | 400 | 1.60 | 0.5px |
| 14 | Micro | `.text-micro` | Sans | 9.6px | 400 | 1.60 | 0.096px |

另外，Code 样式通过元素选择器生效（不提供 class）：

| 用途 | 字体 | 字号 | 字重 | 行高 | Letter-Spacing |
|------|------|------|------|------|----------------|
| 代码块 / 内联代码 | Mono (SFMono, Menlo, Monaco, Consolas, monospace) | 15px | 400 | 1.60 | -0.32px |

字体栈定义（`:root`）：
- `--font-serif`: `Georgia, 'Times New Roman', Times, serif`
- `--font-sans`: `Arial, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif`
- `--font-mono`: `SFMono-Regular, Menlo, Monaco, Consolas, 'Courier New', monospace`

全局默认：`body` 字号 16px、行高 1.60、font-family `var(--font-sans)`。

元素默认（通过标签选择器）：
- `h1, h2, h3, .el-dialog__title` → `var(--font-serif)`
- `code, pre` → `var(--font-mono)`, 15px, 1.60, -0.32px letter-spacing

### 4. Spacing 对齐 8px Base Scale

- `layout-pd` 从 15px 改为 16px
- 所有 padding/margin/gap 值必须选自 DESIGN.md scale：3, 4, 6, 8, 10, 12, 16, 20, 24, 30
- 现有值如果不在此列表中，取最接近的 scale 值

### 5. Depth & Elevation 系统

按 DESIGN.md Section 6 定义 5 级深度体系，控制卡片、按钮、容器等组件的交互状态：

| Level | 名称 | 实现 | 用途 |
|-------|------|------|------|
| 0 | Flat | 无 shadow 无 border | 页面背景、内联文本 |
| 1 | Contained | `1px solid var(--color-border-cream)` | 标准卡片、区域分隔 |
| 2 | Ring | `0px 0px 0px 1px var(--color-ring-warm)` | 交互卡片、按钮 hover/focus |
| 3 | Whisper | `rgba(0,0,0,0.05) 0px 4px 24px` | 悬浮卡片、特色内容 |
| 4 | Inset | `inset 0px 0px 0px 1px rgba(0,0,0,0.15)` | 按钮 active/pressed 状态 |

实现方式：
- 作为 CSS 类定义在 `app.scss` 中（`.elevation-flat`、`.elevation-contained`、`.elevation-ring`、`.elevation-whisper`、`.elevation-inset`）
- `element.scss` 中组件样式引用这些类或对应的 CSS 规则
- 按钮 hover 态使用 Ring（Level 2），active/pressed 态使用 Inset（Level 4）
- 卡片默认使用 Contained（Level 1）或 Whisper（Level 3）

### 6. 删除 Gradients

DESIGN.md 明确声明 Claude 设计系统是 **gradient-free** 的——深度来自暖色调表面之间的交错，而非渐变。现有 `--next-bg-main-gradient` 变量必须删除，`background` 统一改用 `var(--color-parchment)` 纯色。

### 7. 暗色模式删除

- `dark.scss` 文件直接删除
- `index.scss` 中 `@use './dark.scss'` 移除

### 8. Vue 组件改造

所有 `.vue` 文件的 `<style>` 块改为 `<style lang="scss">`：
- 硬编码 hex 颜色替换为 `var(--color-xxx)`
- 硬编码 font-size 替换为 Typography Scale 类名（`.text-body` 等）
- 内联 `style=""` 抽成 CSS class
- 可通过 `@use` 引用 theme token（如需）

### 9. 品牌色梯度保留

Element Plus 品牌色 9 级梯度（`--el-color-primary-light-1` ~ `light-9`, `dark-2`）保留手调值，不依赖 Element Plus 自动生成算法。

## Testing Decisions

- 不需要自动化测试，属于纯样式重构
- 验证方式：运行 `npm run dev`，逐页浏览确认视觉效果无回归
- 重点检查：按钮颜色、输入框圆角、卡片阴影、字体层级是否正确
- 对比标准：直接对照 DESIGN.md 的 `preview.html`（light 模式），暗色已删除不再对照 `preview-dark.html`

## Out of Scope

- `resumeThemeCss.ts` 及其 5 个简历主题（不在当前 A 范围内）
- `other.scss`、`waves.scss`、`loading.scss`、`iconSelector.scss`、`tableTool.scss`
- `common/` 子目录所有文件
- `mixins/`、`media/`、`fonts/` 子目录
- 功能逻辑修改
- 新增组件
- 暗色模式重新实现

## Implementation Order

1. `dark.scss` — 删除文件，`index.scss` 移除引用
2. `app.scss` — 重写变量层 + Typography Scale + spacing 对齐
3. `element.scss` — 去重 + hex→var() + DESIGN.md 校正
4. Vue 组件 — 逐个改造 `<style>` → `<style lang="scss">` + 变量引用

   优先级顺序：
   a) 全局布局组件：`Layout.vue`、`App.vue`
   b) 通用组件：`SectionCard.vue`、`MarkdownRenderer.vue`、`PdfPageView.vue`、`DiffViewer.vue`、`RichTextEditor.vue`、`MarkdownEditor.vue`
   c) 聊天组件：`ChatWindow.vue`、`MessageItem.vue`、`MessageInput.vue`、`ConversationList.vue`
   d) 简历相关视图：`ResumeGeneratorNew.vue`、`ResumeGenerator.vue`、`ResumeEditor.vue`、`Resume.vue`、`ResumePreview.vue`、`ResumeAIDiagnosis.vue`
   e) 其余视图页面：`Dashboard.vue`、`InterviewRoom.vue`、`History.vue`、`Settings.vue`、`Profile.vue` 等
   f) 简历子组件：`TemplateSidebar.vue`、`StyleAdjustmentPanel.vue`、`ResumePreviewPanel.vue`、`AIChatPanel.vue` 等
   g) 其余子组件和公共组件

## Further Notes

- DESIGN.md 来源：https://github.com/VoltAgent/awesome-design-md/blob/main/design-md/claude/DESIGN.md — 提取自 claude.ai 公开网站的设计规范
- 参考实现：`G:\documents\GitHub\AI_interview\claude\preview.html`（仅 light 模式）
- 上文 decision #2 中"后半部分"即 element.scss 第 683 行起，"前半部分"即 683 行之前
