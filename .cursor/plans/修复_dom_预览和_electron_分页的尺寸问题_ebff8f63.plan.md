---
name: 修复 DOM 预览和 Electron 分页的尺寸问题
overview: 修复 DOM 预览 iframe 宽度和 Electron 分页计算中的 A4 尺寸不一致问题。
todos:
  - id: fix-dom-iframe-width
    content: 修复 DOM 预览 iframe 宽度改为 894px（总宽）并更新 CSS
    status: completed
  - id: fix-electron-capture-sizes
    content: 修复 capturePageImagesByPdfBreaks 硬编码尺寸，添加正确常量
    status: completed
  - id: update-constants-comments
    content: 统一 A4 尺寸常量注释，更新元数据显示
    status: completed
isProject: false
---

## 问题分析

经过对比 Obsidian 参考实现和当前代码，发现两处关键不一致：

### 问题 1：DOM 预览 iframe 宽度错误（最关键）

当前代码（`functions.js`）：

```js
const A4_WIDTH_CSS = Math.round(210 / 25.4 * 96);   // 794px — 这是内容宽度
```

```html
<!-- test-pdf-realtime.html -->
<iframe id="dom-preview-frame" ... width: 794px ...></iframe>
```

`794px` 是 A4 **内容区宽度**（不含左右边距）。实际 A4 纸在 96dpi 下总宽为 `210mm * 96/25.4 = 794px`，但 `794px` 不包含 `marginLeft + marginRight = 50+50 = 100px`。加上边距后总宽为 `894px`。

而 `renderDomPreview` 中的 `body { width: 794px; margin: 0 auto; }` 实际上会让 body 在 794px 宽的 iframe 中"全宽"显示，看起来正常，但这与 Electron API 中的实际布局不一致（Electron 传给 PDF 的视口宽是 894px，含边距）。

**对比 Obsidian**：Obsidian 的 `webview` 直接塞满父容器，用 `transform: scale(1/scale)` 缩放来精确匹配 A4。测试页面没有这套缩放逻辑，所以直接让 iframe 等于总宽（894px）即可。

### 问题 2：`capturePageImagesByPdfBreaks` 硬编码错误

当前代码（`main.cjs` 第 302-307 行）：

```js
const A4ContentWidthPx = 1058;   // 错误：没有哪个 A4 尺寸等于 1058px！
const A4ContentHeightPx = Math.ceil(841.89 * ptToPx); // = 1123px — 正确
```

`1058px` 没有任何依据（可能是历史遗留错误）。A4 内容区宽度应该是：

- A4 总宽（94px/25.4=794px）含 marginLeft(50px/96in) + content(794px) + marginRight(50px/96in) = **894px**
- 不含边距内容区 = **794px**

### 问题 3：pageBreaks 数组含义混淆

当前 `pageBreaks` 返回的是 `heightPt`（每页高度），但 `capturePageImagesByPdfBreaks` 里使用的是固定 `A4ContentHeightPx = 1123px`（A4 总高），不是"内容高"。这导致 scrollY 定位与 PDF 实际分页位置不匹配。

---

## 具体改动

### 改动 1：`functions.js` — 更新注释，说明 794px 的含义

```js
// A4 内容区（不含边距）在 96dpi 下的像素宽度
// 210mm * 96/25.4 = 793.7 ≈ 794px
// 注意：这是 body 内容宽度，不含 marginLeft+marginRight
// Electron 视口总宽（含边距）= 794 + 50 + 50 = 894px
const A4_WIDTH_CSS = Math.round(210 / 25.4 * 96);   // 794px
```

同时在 `renderDomPreview` 的元数据文本中改为：

```js
meta.textContent = 'DOM 渲染 · A4 ' + A4_WIDTH_CSS + 'px（含边距 894px）× ' + A4_HEIGHT_CSS + 'px @ 96dpi · 内容区 ' + A4_WIDTH_CSS + 'px · 用时 ' + elapsed + 'ms';
```

### 改动 2：`test-pdf-realtime.html` — 将 iframe 宽度改为 894px（总宽）

```html
<iframe id="dom-preview-frame" style="width: 894px;" ...></iframe>
```

并同步更新 CSS 中的 `dom-preview-frame` 宽度：

```css
#dom-preview-frame {
  width: 894px;   /* 原来是 794px */
  ...
}
```

### 改动 3：`main.cjs` — 修复 `capturePageImagesByPdfBreaks` 硬编码

```js
// A4 内容区在 96dpi 下的像素尺寸
// 纸宽：210mm * 96/25.4 = 794px（内容区），视口总宽（含边距）= 794 + 50 + 50 = 894px
// 纸高：297mm * 96/25.4 = 1123px（总高），内容高 = 1123 - 40 - 40 = 1043px
const ptToPx = 96 / 72;
const A4_CONTENT_WIDTH_PX  = 794;   // A4 内容宽（不含边距），与 body width: 794px 一致
const A4_VIEWPORT_WIDTH_PX = 894;   // 视口总宽（含边距 50+50）
const A4_CONTENT_HEIGHT_PX = Math.ceil((297 - 40 - 40) * 96 / 25.4);  // = 1043px（不含边距）
```

然后将所有 `A4ContentWidthPx` 替换为 `A4_VIEWPORT_WIDTH_PX`（用于 setContentSize），同时修正 scrollY 逻辑：

```js
const A4_CONTENT_HEIGHT_PT = 841.89;  // A4 内容高（不含边距）= 841.89pt
const scrollY = Math.round(i * A4_CONTENT_HEIGHT_PT * ptToPx);
```

### 改动 4：`main.cjs` — 统一分页尺寸引用

`parsePdfPageBreaks` 返回的 `heightPt` 实际是 A4 纸总高 841.89pt（因为 `page.getHeight()` 返回的是整个 MediaBox 高），但应该用"内容高"来计算 scrollY。

改为：保持 `parsePdfPageBreaks` 返回原始 MediaBox 高度，但在 `capturePageImagesByPdfBreaks` 中直接用 `A4_CONTENT_HEIGHT_PT * ptToPx` 计算 scrollY，而不依赖 `pageBreaks` 中的高度。

```js
// parsePdfPageBreaks 仍然返回 MediaBox 高度（用于 pageCount 等元信息）
// capturePageImagesByPdfBreaks 用固定 A4 内容高来滚动：
const A4_CONTENT_HEIGHT_PT = 841.89; // A4 内容高，不含 top+bottom 边距
const scrollY = Math.round(i * A4_CONTENT_HEIGHT_PT * ptToPx);  // = i * 1043px
```

### 改动 5：统一元数据显示

更新 `renderElectronPreview` 中 `metaDiv.textContent` 的 A4 尺寸描述，与实际一致。

---

## 验证方法

刷新 `test-pdf-realtime.html` 后：

1. DOM 预览 iframe 宽度变为 894px，页面内容 794px 居中，两侧各有 50px 留白
2. Electron API 返回的 `pageBreaks` 数值稳定在 841.89pt（整页）或接近 841.89 的合理值
3. 按钮点击触发渲染后，console 无 `Unexpected end of input` 等错误

