---
name: Debug blank PDF rendering in Electron
overview: Add a debug endpoint that captures screenshot + DOM state + PDF without relying on console output, to diagnose why printToPDF produces blank pages while capturePage works.
todos: []
isProject: false
---

## 诊断策略

无法通过 Electron 终端日志调试（Electron 在后台运行）。换用**HTTP debug 端点**直接返回诊断数据。

## 修改文件

### 1. `ai-interview-frontend/electron/main.cjs` — 添加 debug 端点

在 `createHttpServer` 的路由部分，在 `if (req.method === 'GET' && req.url === '/health')` 之前插入：

```js
// ========== 调试端点：返回当前 DOM 截图 + 渲染状态 ==========
if (req.method === 'GET' && req.url === '/api/debug') {
  try {
    const info = await win.webContents.executeJavaScript(`
      ({
        bodyScrollHeight: document.body ? document.body.scrollHeight : 0,
        bodyScrollWidth: document.body ? document.body.scrollWidth : 0,
        bodyTextLength: document.body ? document.body.textContent.trim().length : 0,
        hasResumeDoc: !!document.querySelector('.resume-document'),
        hasMarkdownBody: !!document.querySelector('.markdown-body'),
        documentTitle: document.title,
        readyState: document.readyState,
      })
    `);
    const screenshot = await win.webContents.capturePage();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      domInfo: info,
      screenshotBase64: screenshot.toPNG().toString('base64'),
    }, null, 2));
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: err.message }));
  }
  return;
}
```

### 2. `ai-interview-frontend/electron/main.cjs` — 在 `generatePdfPreview` 中加 DOM 快照

在 `waitForRender(win)` 之后、`printToPDF` 之前，插入：

```js
// ========== 调试：printToPDF 前检查 DOM 状态 ==========
const domBeforePdf = await win.webContents.executeJavaScript(`
  JSON.stringify({
    bodyScrollHeight: document.body.scrollHeight,
    bodyScrollWidth: document.body.scrollWidth,
    bodyTextLength: document.body.textContent.trim().length,
    hasResumeDoc: !!document.querySelector('.resume-document'),
    hasMarkdownBody: !!document.querySelector('.markdown-body'),
  })
`);
console.log('[DEBUG] printToPDF 前 DOM:', domBeforePdf);
```

### 3. `Test/test-pdf-api.html` — 添加 debug 按钮

在现有按钮区域添加：

```html
<button onclick="sendDebug()" class="secondary">GET /api/debug（调试截图）</button>
```

```js
async function sendDebug() {
  const res = await fetch('http://localhost:9999/api/debug');
  const data = await res.json();
  document.getElementById('response').textContent = JSON.stringify(data.domInfo, null, 2);
  if (data.screenshotBase64) {
    document.getElementById('previewImages').innerHTML =
      '<img src="data:image/png;base64,' + data.screenshotBase64 + '">';
  }
}
```

## 预期结果

点击 debug 按钮后：

- `bodyScrollHeight` > 0 且 `bodyTextLength` > 0 → DOM 正常，问题在 printToPDF
- `bodyScrollHeight` ≈ 0 → DOM 未加载，问题在 loadHtmlWithAnchors
- `screenshotBase64` 显示截图内容 → 截图正常，问题在 printToPDF 配置
- `screenshotBase64` 空白 → 整体渲染失败

