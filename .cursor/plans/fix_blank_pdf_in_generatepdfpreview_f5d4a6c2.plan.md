---
name: Fix blank PDF in generatePdfPreview
overview: Fix blank PDF output by using the original printToPDF output instead of re-saving through pdf-lib, which strips header/footer annotations.
todos: []
isProject: false
---

## 问题根因

`generatePdfPreview` 在第 369 行用 `pdf-lib` 加载了 Chromium `printToPDF` 的结果，第 383 行又调用 `pdfDoc.save()` 重新保存。但 **pdf-lib 的 `save()` 不保留 Chromium header/footer 的视觉内容**——header/footer 在 PDF 中只是注解（annotation），pdf-lib 会丢弃这些注解。

第 388 行返回的 `pdfBase64` 来自 `finalPdfData`（`pdfDoc.save()`），所以 PDF 空白。

## 修复方案

**文件**：`ai-interview-frontend/electron/main.cjs`

在 `generatePdfPreview` 函数中，用 `Buffer.from(pdfData)` 替代 `finalPdfData`：

```js
// 改前（第 383-388 行）
const finalPdfData = await pdfDoc.save();
// ...
return {
    // ...
    pdfBase64: Buffer.from(finalPdfData).toString('base64'),
};

// 改后
return {
    // ...
    pdfBase64: Buffer.from(pdfData).toString('base64'),  // 直接用原始 printToPDF 输出
};
```

注意：`pdfData` 是 `win.webContents.printToPDF()` 返回的 `Buffer`，已是正确格式，不需要再次 `save()`。保留 `pdfDoc` 仅用于 `parsePdfPageBreaks` 解析分页即可。