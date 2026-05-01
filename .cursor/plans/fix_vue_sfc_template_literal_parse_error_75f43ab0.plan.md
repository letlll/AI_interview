---
name: Fix Vue SFC template literal parse error
overview: 将 ResumeGeneratorNew.vue 中第 1340-1356 行包含 `${}` 插值的多行模板字符串替换为字符串拼接语法，消除 Babel 解析错误。
todos:
  - id: fix-template-literal
    content: 将第 1340-1356 行的 backtick 模板字符串替换为字符串拼接
    status: pending
isProject: false
---

## 问题

`ResumeGeneratorNew.vue` 中第 1340-1356 行存在包含 `${}` 插值的多行模板字符串，导致 Vue SFC 编译器（Babel）解析失败，报告 `Unexpected token` 错误。

## 修复方案

将第 1340-1356 行中模拟数据的模板字符串替换为字符串拼接语法。

### 修改文件

**[ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue)**

将第 1340-1356 行的模板字符串：

```js
value: '## 工作经历\n\n' +
  '- **字节跳动** | 2021.06 - 至今\n' +
  '  - 负责公司核心产品的前端开发工作，使用 Vue3 + TypeScript 技术栈\n' +
  // ...
```

（使用 `'...'` 单引号拼接替代原来的 backtick 模板字符串）

### 验证

修复后重启 Vite dev server，页面应能正常加载，`[vue/compiler-sfc] Unexpected token` 错误消失。