---
name: Fix first page header missing in Electron PDF preview
overview: "Remove `@page :first { margin-top: 0 }` from `injectPageCss()` in main.cjs, since `padding: 0 !important` in the HTML reset block already removes resume-document padding, so the first page margin no longer needs compensation."
todos:
  - id: fix-first-page-header
    content: "Remove @page :first { margin-top: 0 } from injectPageCss in main.cjs"
    status: pending
isProject: false
---

## 根因

在 `ai-interview-frontend/electron/main.cjs` 第 88-90 行：

```js
@page :first {
  margin-top: 0;  /* 补偿 .resume-document padding-top: 40px */
}
```

这将首页 top margin 设为 0，而 `displayHeaderFooter: true` 时 Chromium 把 header 渲染在 top margin 区域。margin 为 0 导致 header 被裁切，首页看不到页眉。

但实际上 `ResumeGeneratorNew.vue` 中的 reset 块已将 `.resume-document` 的 padding 设为 `0 !important`（用户确认这是正确的），因此不再需要这个补偿规则。

## 修复步骤

### 修改 `ai-interview-frontend/electron/main.cjs`

**文件：** `ai-interview-frontend/electron/main.cjs`

**位置：** 第 81-114 行 `injectPageCss()` 函数

将：

```js
function injectPageCss(html, marginTop, marginBottom, marginLeft, marginRight) {
  const pageCss = `
<style>
@page {
  size: A4;
  margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
}
@page :first {
  margin-top: 0;  /* 补偿 .resume-document padding-top: 40px */
}
/* ... 后续样式 ... */
`;
```

改为：

```js
function injectPageCss(html, marginTop, marginBottom, marginLeft, marginRight) {
  const pageCss = `
<style>
@page {
  size: A4;
  margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
}
/* 所有页面统一 margin，header/footer 均有足够空间渲染 */
```

