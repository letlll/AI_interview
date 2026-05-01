---
name: Fix Markdown rendering structure consistency
overview: 通过 (1) 将 markdownToHtml 中已存在的 autoDetectSectionType 逻辑迁移到 MarkdownRenderer.vue 的 heading renderer，确保两个渲染路径输出一致的 HTML 结构；(2) 修正 H3 项目标题的层级语义问题；(3) 统一 getThemeCss 中的 CSS 优先级冲突。
todos:
  - id: add-auto-detect-to-renderer
    content: 在 MarkdownRenderer.vue 中添加 autoDetectSectionType 函数并修改 heading renderer
    status: pending
  - id: fix-theme-css-priority
    content: 在 ResumeGeneratorNew.vue 中修复 getThemeCss CSS 优先级
    status: pending
  - id: verify-consistency
    content: 验证两个渲染路径输出一致的 HTML 结构
    status: pending
isProject: false
---

# 修复简历 Markdown 渲染结构一致性与 CSS 优先级

## 问题分析

### 根因一：两个渲染路径的结构不一致

项目中有**两个 Markdown → HTML 渲染路径**：


| 路径               | 位置                                          | section type 检测                                         |
| ---------------- | ------------------------------------------- | ------------------------------------------------------- |
| 实时预览（Vue 组件）     | `MarkdownRenderer.vue` heading renderer     | 依赖 `<!-- section:TYPE -->` 注释，`currentSectionType` 默认为空 |
| Electron API（后端） | `ResumeGeneratorNew.vue` `markdownToHtml()` | 使用 `autoDetectSectionType()` 自动识别                       |


当 Markdown 中没有 `<!-- section:TYPE -->` 标记时（AI 生成的 Markdown 默认没有），`MarkdownRenderer.vue` 的 heading renderer 输出的 `data-section-type` 和 class 都是空的/不一致的，导致：

- H6 项目标题的 class 有时是 `section-title h6`，有时是 `section-title section-title--projects h6`
- 教育/技能/工作模块的 border-left 颜色没有正确应用

**解决方案**：将 `autoDetectSectionType` 逻辑迁移到 `MarkdownRenderer.vue` 的 heading renderer 中，使两个路径行为一致。

### 根因二：H6 项目标题的层级语义错误

当前 AI 生成的 Markdown 中，项目名称用 `######`（H6），但 CSS 设计中 H6 是 `.subsection-title`（子标题样式），而非 `.section-title`。项目名应该用 `##`（H2）或 `###`（H3）。

需要在后端 `ai_services.py` 中修改 AI prompt，引导其生成正确层级的 Markdown。

### 根因三：getThemeCss 中的 CSS 优先级冲突

`getThemeCss` 中每个主题都有：

```css
.resume-document.theme-blue .section-title { color: #1f1f1f; ... }
```

这覆盖了 `.section-title--skills/summary` 的 `color: #666666; font-style: italic`。

---

## 修改计划

### 修改 1：`MarkdownRenderer.vue` — 添加 autoDetectSectionType 逻辑

**文件**: `ai-interview-frontend/src/components/common/MarkdownRenderer.vue`

将 `postProcessSections` 函数之前添加 `autoDetectSectionType` 辅助函数，然后修改 heading renderer 的闭包变量引用，改用自动检测替代依赖全局 `currentSectionType` 标记。

具体改动：

1. 在 `let currentSectionType = ''` 后面添加 `autoDetectSectionType` 函数定义
2. 在 heading renderer 中，对 depth === 2（h2）的标题调用 `autoDetectSectionType`，对 depth >= 3 的子标题继承父 section type

### 修改 2：`ResumeGeneratorNew.vue` — 修复 getThemeCss 优先级

**文件**: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

删除所有 5 个主题中 `.section-title` 通用规则的 `color` 属性，保留 `border-bottom-color`。这样 `--skills`/`--summary` 保留 `color: #666666; font-style: italic` 样式。

### 修改 3（可选）：`ai_services.py` — 修正 AI prompt 中的标题层级

**文件**: `ai_interview_backend/interviews/ai_services.py`

在 `generate_resume_by_ai` 和 `generate_resume_chat_response` 的 prompt 中补充说明：

- 大模块标题用 `##`，不要用 `###` 或 `####`
- 项目名称用 `###` 或放在项目描述的同一行，不用 `######`

---

## CSS 加载顺序（不变，确认当前已正确）

```
1. 全局 reset (.resume-document { padding: 0 !important; ... })
2. resumeMarkdownRaw（完整 CSS 结构）
3. getThemeCss（主题色硬编码，覆盖 resumeMarkdownRaw 末尾）
4. extraStyles（用户自定义，最高层级）
```

当前 `markdownToHtml` 的 CSS 加载顺序是正确的，无需修改。