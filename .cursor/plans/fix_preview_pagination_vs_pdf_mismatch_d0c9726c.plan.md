---
name: Fix preview pagination vs PDF mismatch
overview: 修复预览截图分页与PDF实际分页不一致的问题：预览使用固定1123px分割导致首页内容被截断/错位，需改为基于PDF真实每页高度的累积scrollY计算。
todos: []
isProject: false
---

## 修复：预览分页与PDF不一致（文字被截断/内容错位）

### 根因

`capturePageImagesByPdfBreaks` 中使用固定 1123px 计算每页 scrollY：

```javascript
// 第 320 行 - 硬编码固定高度，与 PDF 真实分页无关
const scrollY = Math.round(i * A4ContentHeightPx);  // A4ContentHeightPx = 1123
```

同时 `parsePdfPageBreaks` 所有页都返回固定纸高（841.89pt），没有考虑实际分页差异。

第一页因为 `@page :first { margin-top: 0 }` 导致内容布局不同，真实内容高度与 1123px 不匹配，后续页 scrollY 全部错位。

### 修复方案

#### 1. 修正 `parsePdfPageBreaks` — 使用 PDF 实际 MediaBox 高度

当前代码（错误）：

```javascript
// 第 271 行 - 所有页返回固定纸高（841.89pt），忽略 CSS @page margin 对内容区的影响
const heightPt = page.getHeight() / 1000 / 25.4 * 72;
```

正确做法：`page.getHeight()` 返回的是 **MediaBox 高度**（整页高度，包括 margin 区域），不受 CSS @page margin 影响。用它计算每页在 CSS 分页下的**内容区实际高度**。

但由于 CSS `@page margin` 会占用部分高度，每页的**内容区可用高度**应该是：

```
内容区高度 = MediaBox高度 - marginTop - marginBottom（单位需统一转换）
```

由于 `@page margin` 用 CSS px 单位（被注入到 HTML 的 `injectPageCss`），而 PDF pt 是点的绝对单位，需要统一。

**更简单可靠的方案**：直接用 `page.getHeight()` 的值作为每页截取的**累积偏移基准**，不需要减去 margin —— 因为 CSS 分页时，DOM scrollHeight 的分页点由 CSS @page margin 决定，而 `page.getHeight()` 本身已经包含了 margin 区域。

**最终方案**：每页高度 = `page.getHeight()`（MediaBox 微米 → pt → px），累积 scrollY 改为基于每页真实高度。

#### 2. 修正 `capturePageImagesByPdfBreaks` — 基于 PDF 实际高度计算 scrollY

当前代码（错误）：

```javascript
const scrollY = Math.round(i * A4ContentHeightPx);  // 1123px * i
```

修改为：

```javascript
// 计算到当前页之前的累积高度
let cumulativeScrollY = 0;
for (let j = 0; j < i; j++) {
  cumulativeScrollY += pageBreaks[j].heightPx;  // 使用转换后的px
}
const scrollY = cumulativeScrollY;
```

每页的 `heightPx` 由 PDF MediaBox 高度（微米）转换而来。

#### 3. 添加调试日志

在截图循环中打印每页的 scrollY 和截图范围，便于排查。

### 涉及文件

`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)`

修改位置：

- `parsePdfPageBreaks` 函数（第 262-286 行）：每页 `heightPt` 改为真实 MediaBox 高度，同时记录 `heightPx`
- `capturePageImagesByPdfBreaks` 函数（第 301-340 行）：scrollY 改为累积计算

