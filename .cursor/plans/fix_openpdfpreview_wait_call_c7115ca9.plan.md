---
name: Fix openPdfPreview wait call
overview: 修复 ResumeGeneratorNew.vue 中 openPdfPreview 函数定义了 waitForContentReady 但从未调用的问题，一行代码改动。
todos: []
isProject: false
---

## 问题

`openPdfPreview()` 中定义了 `waitForContentReady` 轮询函数（第 641-651 行），但从未调用它。第 655-657 行仍然直接调用 `fetchPreview()`，完全绕过了等待 `contentRef` 就绪的逻辑。

## 修复

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 655-657 行

**将：**

```javascript
nextTick().then(() => {
  fetchPreview();
});
```

**改为：**

```javascript
nextTick().then(() => {
  waitForContentReady();
});
```

**效果**：`openPdfPreview` 现在会等待 `getExportInnerHtml()` 返回非空内容（最多 2 秒），再调用 `fetchPreview()`，避免竞态条件。