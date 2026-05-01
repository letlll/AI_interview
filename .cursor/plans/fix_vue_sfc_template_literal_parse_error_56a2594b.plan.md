---
name: Fix Vue SFC template literal parse error
overview: 修复 ResumeGeneratorNew.vue 中的模板字符串导致的 Babel 解析错误，将所有包含 `${}` 插值的多行模板字符串替换为字符串拼接。
todos: []
isProject: false
---

## 问题

`ResumeGeneratorNew.vue` 中存在多处包含 `${}` 插值的多行模板字符串（backtick），导致 Vue SFC 编译器（Babel）解析失败，报告 `Unexpected token` 错误。

## 修复方案

将所有包含 `${...}` 插值的模板字符串全部替换为字符串拼接语法。

### 关键修改点

**[ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue)**

1. **第 1340-1356 行** — 模拟数据中的多行模板字符串（最大块，约 17 行）：
  ```js
   // 替换前
   value: `## 工作经历\n\n- **字节跳动** | ...
  ```
2. 确认第 533-607 行的 `buildPdfHtmlDocument` 和第 542 行附近（原 `markdownToHtml`）的修复已在之前正确应用。

### 验证

修复后重启 Vite dev server，页面应能正常加载，`[vue/compiler-sfc] Unexpected token` 错误消失。