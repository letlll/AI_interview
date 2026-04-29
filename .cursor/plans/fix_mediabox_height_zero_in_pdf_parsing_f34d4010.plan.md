---
name: Fix mediabox height zero in PDF parsing
overview: Fix parsePdfPageBreaks to use page.getBounds() instead of getMediaBox(), since pdf-lib v1.17.1 changed the return type. Also add a /api/parsedebug endpoint to inspect raw PDF structure.
todos: []
isProject: false
---

## 根因分析

`mediabox 高度为 0` 的直接原因：`parsePdfPageBreaks` 中 `page.getMediaBox()` 在 pdf-lib ^1.17.1 中返回 `PDFDict` 或 `PDFName`，`instanceof PDFArray` 为 false，fallback 取到全 0，导致截图高度也是 0。

## 修改文件

### 1. `ai-interview-frontend/electron/main.cjs` — 修复 `parsePdfPageBreaks`

将 `page.getMediaBox()` 替换为 `page.getBounds()`：

```js
function parsePdfPageBreaks(pdfDoc) {
  const pages = pdfDoc.getPages();
  const pageBreaks = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // getBounds() 返回 [x1, y1, x2, y2]，y2 = 高度，始终为数值
    const [x1, y1, x2, y2] = page.getBounds();

    const heightPt = y2 - y1;
    const widthPt = x2 - x1;

    console.log(`[parsePdfPageBreaks] 页 ${i + 1}: width=${widthPt}pt, height=${heightPt}pt`);

    pageBreaks.push({
      pageIndex: i,
      heightPt: heightPt,
      widthPt: widthPt,
      mediaboxBottom: y1,
      mediaboxTop: y2,
    });
  }

  return pageBreaks;
}
```

### 2. `ai-interview-frontend/electron/main.cjs` — 添加 /api/parsedebug 端点

在 `/api/debug` 端点之后、`/health` 之前插入，用于返回原始 PDF 分页数据（不依赖截图）：

```js
// ========== 调试端点：返回原始 PDF 结构（parsePdfPageBreaks 输出） ==========
if (req.method === 'GET' && req.url === '/api/parsedebug') {
  try {
    const pdfDoc = await PDFDocument.load(Buffer.from(lastPdfData));
    const pages = pdfDoc.getPages();
    const raw = pages.map((page, i) => {
      const [x1, y1, x2, y2] = page.getBounds();
      const mediabox = page.getMediaBox();
      return {
        page: i + 1,
        bounds: { x1, y1, x2, y2 },
        heightPt: y2 - y1,
        mediaboxType: mediabox?.constructor?.name,
        mediaboxKeys: mediabox?.keys ? [...mediabox.keys()] : null,
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(raw, null, 2));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
  return;
}
```

同时在 `generatePdfPreview` 结束时保存一份 PDF 数据供 `lastPdfData` 引用（用模块级变量）。

### 3. `Test/test-pdf-api.html` — 添加 parsedebug 按钮

在 `sendDebug()` 之后添加：

```js
async function sendParsedebug() {
  const res = await fetch('http://localhost:9999/api/parsedebug');
  const data = await res.json();
  document.getElementById('response').textContent = JSON.stringify(data, null, 2);
  document.getElementById('previewImages').innerHTML = '';
}
```

```html
<button onclick="sendParsedebug()" class="secondary">GET /api/parsedebug（PDF结构）</button>
```

## 验证方法

1. 重启 Electron
2. 用 test-pdf-api.html 发送请求
3. 检查每页 `heightPt` 是否大于 0
4. 检查 `pageImages` 预览图是否正常显示内容

