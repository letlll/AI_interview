---
name: Fix PDF blank and preview pagination
overview: 修复两个问题：(1) PDF 导出空白 + 尺寸异常大，(2) 预览分页不正确。根因分别是 Electron printToPDF 的 pageSize/margins 单位错误（应用英寸而非微米/像素）、以及 parsePdfPageBreaks 的单位错误（返回微米而非点）。
todos: []
isProject: false
---

## 根因分析

通过对比 Obsidian better-export-pdf 插件源码，发现三个关键 bug：

### Bug 1: printToPDF pageSize 单位错误（导致 PDF 尺寸异常大）

Obsidian 插件（`pdf.ts` 第 375-381 行）：

```typescript
pageSize: {
  width: safeParseFloat(config["pageWidth"], 210) / 25.4,  // 毫米 → 英寸
  height: safeParseFloat(config["pageHeight"], 297) / 25.4,
},
```

Chromium `printToPDF` 的 `pageSize` 单位是**英寸**，不是微米，也不是像素。当前代码传 `210 * 1000 = 210000`（微米），但 Electron 把它当作英寸，生成 210000 英寸宽的 PDF（≈5333 米）。

### Bug 2: margins 单位错误（导致 PDF 空白）

Obsidian 插件（`pdf.ts` 第 427-433 行）：

```typescript
top: safeParseFloat(config["marginTop"], 0) / 25.4,  // 毫米 → 英寸
```

CSS 使用像素（96 DPI），需要先像素→毫米（/3.779528）再毫米→英寸（/25.4），即**像素 / 96**。当前代码直接传像素 40，作为英寸是 40 英寸顶边距，内容完全移出页面。

### Bug 3: parsePdfPageBreaks 单位错误（导致预览窗口 GPU 崩溃）

```javascript
// 当前（错误）：page.getHeight() 返回微米（595276 = 595.276mm），不是点
const pageHeightPx = Math.ceil(parseFloat(heightPt) * ptToPx);
// 21384000 * 1.333 = 28512000 px → GPU 崩溃
```

正确：`page.getHeight()` 返回微米，需 `/ 1000 / 25.4 * 72` 才得到点（≈841.89 pt）。

---

## 修复步骤

### 1. 修复 `injectPageCss` 中的 pageSize 注入

文件：`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)`

将 `@page { size: A4; }` 保持不变（CSS 单位本身正确），但关键是让 printToPDF 选项与之一致。

### 2. 修复 `generatePdf` 和 `generatePdfPreview` 中的 `printToPDF` 参数

文件：`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)` 第 396-413 行和第 547-563 行

```javascript
// pageSize 单位：英寸（Electron 官方要求）
const pageWidthInches = A4_WIDTH_MM / 25.4;   // 8.268
const pageHeightInches = A4_HEIGHT_MM / 25.4; // 11.693

// margins 单位：英寸（CSS 像素 / 96）
const marginTopIn = marginTop / 96;
const marginBottomIn = marginBottom / 96;
const marginLeftIn = marginLeft / 96;
const marginRightIn = marginRight / 96;

const pdfData = await win.webContents.printToPDF({
  printBackground: true,
  landscape: false,
  pageSize: {
    width: Math.round(pageWidthInches * 1000000),   // 微米
    height: Math.round(pageHeightInches * 1000000),
  },
  margins: {
    marginType: 'custom',
    top: marginTopIn,
    bottom: marginBottomIn,
    left: marginLeftIn,
    right: marginRightIn,
  },
  // ...
});
```

### 3. 修复 `parsePdfPageBreaks` 的单位转换

文件：`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)` 第 259-283 行

```javascript
function parsePdfPageBreaks(pdfDoc) {
  const pages = pdfDoc.getPages();
  const pageBreaks = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];
    // pdf-lib getHeight()/getWidth() 返回微米（μm），不是点
    // 微米 / 1000 = 毫米；毫米 / 25.4 * 72 = 点
    const heightPt = page.getHeight() / 1000 / 25.4 * 72;
    const widthPt  = page.getWidth()  / 1000 / 25.4 * 72;

    pageBreaks.push({
      pageIndex: i,
      heightPt,
      widthPt,
      mediaboxBottom: 0,
      mediaboxTop: heightPt,
    });
  }
  return pageBreaks;
}
```

### 4. 修复 `capturePageImagesByPdfBreaks` 使用正确的每页像素高度

文件：`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)` 第 298-335 行

```javascript
async function capturePageImagesByPdfBreaks(win, pageBreaks) {
  const ptToPx = 96 / 72;  // 1.333
  const A4ContentWidthPx = 1058;
  // 每页精确像素高：从正确的 heightPt（点）换算
  const A4ContentHeightPx = Math.ceil(841.89 * ptToPx); // ≈ 1123px

  // 让窗口高度匹配 DOM 总内容高度（确保多页内容全部可见）
  const domScrollHeight = await win.webContents.executeJavaScript(
    'document.body.scrollHeight'
  );
  await win.setContentSize(A4ContentWidthPx, domScrollHeight + 200);
  await sleep(300);

  const pageImages = [];
  for (let i = 0; i < pageBreaks.length; i++) {
    const scrollY = i * A4ContentHeightPx;
    await win.webContents.executeJavaScript('window.scrollTo(0, ' + scrollY + ')');
    await sleep(400);

    await win.setContentSize(A4ContentWidthPx, A4ContentHeightPx + 50);
    await sleep(300);

    const screenshot = await win.webContents.capturePage();
    const pngBase64 = screenshot.toPNG().toString('base64');
    pageImages.push('data:image/png;base64,' + pngBase64);
  }

  await win.setContentSize(A4ContentWidthPx, A4ContentHeightPx + 200);
  await sleep(100);
  return pageImages;
}
```

