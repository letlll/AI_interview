---
name: Fix first page header missing + theme CSS priority conflict
overview: "修复两个问题：(1) 删除 main.cjs 中 @page :first { margin-top: 0 } 修复首页 header 缺失；(2) 删除 getThemeCss 中通用 .section-title 的 color 属性，修复 section-title--skills/summary 样式被覆盖的问题。"
todos:
  - id: fix-first-page-header
    content: "删除 main.cjs 中 @page :first { margin-top: 0 }，修复首页 header 缺失"
    status: pending
  - id: fix-theme-css-priority
    content: 删除 getThemeCss 中所有主题 .section-title 的 color 属性，修复 section-title--skills/summary 被覆盖
    status: pending
isProject: false
---

## 修改 1：`main.cjs` — 删除首页 margin 补偿

**文件：** `ai-interview-frontend/electron/main.cjs`

将 `injectPageCss()` 函数中 `@page :first { margin-top: 0; }` 整块删除。所有页面统一 top margin，header/footer 均有足够空间渲染。

## 修改 2：`ResumeGeneratorNew.vue` — 修复 `getThemeCss` CSS 优先级

**文件：** `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

### 根因

`getThemeCss` 中每个主题都有：

```js
`.resume-document.theme-blue .section-title { color: #1f1f1f; border-bottom-color: #e8e8e8; }`
```

这覆盖了 `--skills`/`--summary` 的 `color` 和 `font-style: italic`。

### 解决方案

删除所有 5 个主题中通用 `.section-title` 规则的 `color` 属性。具体改动如下：


| 主题            | 删除的规则                                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| theme-blue    | `.resume-document.theme-blue .section-title { color: #1f1f1f; border-bottom-color: #e8e8e8; }` 中的 `color`    |
| theme-dark    | `.resume-document.theme-dark .section-title { color: #e6edf3; border-bottom-color: #30363d; }` 中的 `color`    |
| theme-minimal | `.resume-document.theme-minimal .section-title { color: #1a1a1a; border-bottom-color: #e0e0e0; }` 中的 `color` |
| theme-classic | `.resume-document.theme-classic .section-title { color: #000000; border-bottom-color: #000000; }` 中的 `color` |
| theme-modern  | `.resume-document.theme-modern .section-title { color: #1f1f1f; border-bottom-color: #ede9fe; }` 中的 `color`  |


这样 h1-h4 的通用规则负责默认颜色，`--skills`/`--summary` 保留斜体样式。