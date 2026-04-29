---
name: 修复 parsePdfPageBreaks 单位错误和截图 DPR 问题
overview: 修复两个根本性 bug：parsePdfPageBreaks 的单位转换公式错误导致 pageBreaks 显示为 2.386pt，以及截图尺寸受 DPR 影响比预期大。
todos:
  - id: fix-parsepdfpagebreaks
    content: 修复 parsePdfPageBreaks 单位转换：移除错误的 /1000/25.4*72 公式
    status: completed
  - id: fix-parsedebug
    content: 修复 /api/parsedebug 中的相同单位错误
    status: completed
  - id: fix-capture-dpr
    content: 修复 capturePage DPR 问题：在截图前获取 DPR 并缩放回 1x
    status: completed
isProject: false
---

## 问题分析

通过逐行追踪代码，发现两个根本性 bug：

### Bug 1：`parsePdfPageBreaks` 单位转换公式错误（核心问题）

当前代码（`main.cjs` 第 271 行）：

```js
const heightPt = page.getHeight() / 1000 / 25.4 * 72;
```

`**page.getHeight()` 在 pdf-lib 中返回的就是 PDF 点（pt），不是微米。** 官方文档明确：`page dimensions returned by getHeight() and getWidth() are measured in points (1/72 inch)`。

错误公式假设输入是微米，对 841.89pt 的 A4 页面高度：

- `841.89 / 1000 / 25.4 * 72 = 2.3865448251968504 pt` ← 这就是用户看到的值！
- `2.3865448251968506 / 72 * 96 = 3.18 px` ← 这就是 px 显示值

修复后：`page.getHeight()` 直接就是正确值 841.89pt，无需转换。

### Bug 2：`capturePage` 受设备 DPR（Device Pixel Ratio）影响

用户截图显示 2118×2348px，比预期大 2.5 倍。Electron 的 `capturePage()` 以**物理像素**（DPR 缩放后）返回截图，而非逻辑像素。在 Windows HiDPI（2.5x DPR）上，894×1173px 的窗口截图出来是 2235×2932px，加上内容溢出等可能更接近 2118×2348px。

---

## 具体改动

### 改动 1：`main.cjs` — 修复 `parsePdfPageBreaks` 单位转换

```js
// 修正：pdf-lib getHeight()/getWidth() 直接返回 PDF 点（pt），无需转换
// A4 页面：595.28pt 宽 × 841.89pt 高
const heightPt = page.getHeight();   // 直接就是 pt
const widthPt  = page.getWidth();   // 直接就是 pt
```

同时修正 `/api/parsedebug` 端点中同样的错误（第 732-733 行）：

```js
const heightPt = page.getHeight();   // 直接就是 pt
const widthPt  = page.getWidth();    // 直接就是 pt
```

### 改动 2：`main.cjs` — 修复 `capturePageImagesByPdfBreaks` DPR 问题

在截图前临时将窗口设为 1x DPR，截图后恢复：

```js
async function capturePageImagesByPdfBreaks(win, pageBreaks) {
  const ptToPx = 96 / 72;
  const A4_VIEWPORT_WIDTH_PX = 894;
  const A4_PAGE_HEIGHT_PX    = Math.ceil(841.89 * ptToPx); // = 1123px

  // 获取当前 DPR
  const dpr = win.webContents.getOwnerBrowserWindow().getBounds().width > 0
    ? (await win.webContents.executeJavaScript('window.devicePixelRatio')) || 1
    : 1;

  // 先让窗口高度匹配 DOM 总内容高度
  const domScrollHeight = await win.webContents.executeJavaScript(
    'document.body.scrollHeight'
  );
  await win.setContentSize(A4_VIEWPORT_WIDTH_PX, domScrollHeight + 200);
  await sleep(300);

  const pageImages = [];

  for (let i = 0; i < pageBreaks.length; i++) {
    const scrollY = Math.round(i * A4_PAGE_HEIGHT_PX);
    await win.webContents.executeJavaScript('window.scrollTo(0, ' + scrollY + ')');
    await sleep(400);

    await win.setContentSize(A4_VIEWPORT_WIDTH_PX, A4_PAGE_HEIGHT_PX + 50);
    await sleep(300);

    // 截取页面并按 DPR 缩放回 1x
    const screenshot = await win.webContents.capturePage();
    const scaledWidth  = Math.round(screenshot.getWidth()  / dpr);
    const scaledHeight = Math.round(screenshot.getHeight() / dpr);
    const scaled = screenshot.resize({ width: scaledWidth, height: scaledHeight });
    const pngBase64 = scaled.toPNG().toString('base64');
    console.log('[capturePageImages] 第' + (i + 1) + '页截图大小:', pngBase64.length, 'bytes, 缩放后:', scaledWidth + 'x' + scaledHeight);
    pageImages.push('data:image/png;base64,' + pngBase64);
  }

  // 恢复窗口高度
  await win.setContentSize(A4_VIEWPORT_WIDTH_PX, A4_PAGE_HEIGHT_PX + 200);
  await sleep(100);

  return pageImages;
}
```

### 改动 3：`main.cjs` — 更新错误注释

第 269 行注释修正：

```js
// pdf-lib getHeight()/getWidth() 直接返回 PDF 点（pt），无需任何转换
// A4: 595.28pt 宽 × 841.89pt 高
```

---

## 预期效果

修复后：

- `pageBreaks[pt]` 显示 `[841.89]`（A4 整页高度），不再是 `2.386`
- `pageBreaks[px]` 显示 `841.89pt → 1123px`
- 截图尺寸约为 `894×1123px`（1-page）或 `894×N px`（N-page），不再有 DPR 倍数

