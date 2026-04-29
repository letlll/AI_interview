---
name: Fix three PDF preview issues
overview: "Fix three issues in the Electron PDF backend: (1) `win is not defined` in `/api/debug`, (2) inconsistent float/int dimensions in `capturePageImagesByPdfBreaks`, (3) insufficient `waitForRender` delay before `printToPDF`."
todos:
  - id: fix-win-undefined
    content: "Fix 1: Add mainWindow guard and const win = mainWindow in /api/debug handler"
    status: completed
  - id: fix-dimensions
    content: "Fix 2: Use consistent Math.round for contentWidth and contentHeight in capturePageImagesByPdfBreaks"
    status: completed
  - id: fix-wait-render
    content: "Fix 3: Extend waitForRender to 2 seconds before printToPDF"
    status: completed
isProject: false
---

## Fixes to Apply in `ai-interview-frontend/electron/main.cjs`

### Fix 1 — `/api/debug`: add `mainWindow` guard and `const win = mainWindow`

Replace the bare `const info = await win.webContents.executeJavaScript(...)` at the start of the `GET /api/debug` handler with a guard:

```629:636:main.cjs
      if (req.method === 'GET' && req.url === '/api/debug') {
        try {
          if (!mainWindow || mainWindow.isDestroyed()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Electron 窗口未就绪，请先调用 /api/preview' }));
            return;
          }
          const win = mainWindow;
          const info = await win.webContents.executeJavaScript(`
```

### Fix 2 — `capturePageImagesByPdfBreaks`: consistent integer dimensions

In the `executeJavaScript` that reads `contentWidth`/`contentHeight`, round both values inside the JS string so the backend receives clean integers, and apply `Math.round` in the Node.js code:

```240:253:main.cjs
async function capturePageImagesByPdfBreaks(win, pageBreaks) {
  const { contentHeight, contentWidth } = await win.webContents.executeJavaScript(`
    ({
      contentHeight: Math.round(document.body.scrollHeight),
      contentWidth: Math.round(document.body.scrollWidth)
    })
  `);

  const windowWidth = Math.ceil(contentWidth);
```

### Fix 3 — `generatePdfPreview`: extend `waitForRender` to 2 seconds

Change the 1-second sleep in `waitForRender` to 2 seconds so `printToPDF` and `capturePage` have enough time after DOM renders:

```65:66:main.cjs
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Update the waitForRender call to 2000ms
await waitForRender(win, 2000);   // if signature supports ms, or change sleep inside waitForRender
```

(If `waitForRender` uses a fixed internal sleep, change it to 2 seconds directly.)

---

**Files modified:**

- `ai-interview-frontend/electron/main.cjs` — all three fixes applied

