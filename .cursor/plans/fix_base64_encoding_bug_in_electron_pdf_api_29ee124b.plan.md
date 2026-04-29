---
name: Fix base64 encoding bug in Electron PDF API
overview: "Fix two bugs causing PDF download to fail: a server-side Uint8Array base64 encoding issue and a missing browser-side error handler."
todos:
  - id: fix-server-base64
    content: Fix Uint8Array base64 encoding in Electron main.cjs
    status: completed
  - id: fix-client-atob
    content: Add defensive atob error handling in test-pdf-api.html
    status: completed
isProject: false
---

## 问题根因

### Bug 1（服务端）：`Uint8Array.toString('base64')` 无效

`main.cjs` 第 388 行：

```js
pdfBase64: finalPdfData.toString('base64'),
```

`Uint8Array.prototype.toString()` 不接受 `'base64'` 参数，它返回 `"[object Uint8Array]"` 这样的字符串，完全不是 base64 编码。这是 `atob()` 在浏览器端报 `InvalidCharacterError` 的直接原因。

### Bug 2（客户端）：`atob()` 无防御

`test-pdf-api.html` 第 134 行直接调用 `atob(data.pdfBase64)`，若 base64 无效则抛出未捕获异常。

---

## 修复方案

### 1. 修复服务端 base64 编码

**文件**：`ai-interview-frontend/electron/main.cjs`

将 `finalPdfData.toString('base64')` 替换为 `Buffer.from(finalPdfData).toString('base64')`（Buffer 是 Node.js 全局可用对象，`Buffer.from(uint8array)` 接收 Uint8Array 并返回正确 base64 字符串）。

### 2. 修复客户端 atob 防御

**文件**：`Test/test-pdf-api.html`

在 `sendRequest` 函数的 PDF 下载块中，将 `atob(data.pdfBase64)` 包裹 `try/catch`，捕获 `InvalidCharacterError` 并向用户提示 base64 数据损坏。

---

## 修改详情

**[ai-interview-frontend/electron/main.cjs](ai-interview-frontend/electron/main.cjs)** — 第 388 行：

```js
// 改前
pdfBase64: finalPdfData.toString('base64'),

// 改后
pdfBase64: Buffer.from(finalPdfData).toString('base64'),
```

**[Test/test-pdf-api.html](Test/test-pdf-api.html)** — 第 134-137 行（下载按钮生成逻辑），将 `atob` 调用包裹 `try/catch`：

```js
let bytes;
try {
  const binary = atob(data.pdfBase64);
  bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
} catch (e) {
  status.className = 'error';
  status.textContent = 'PDF 解码失败: ' + e.message;
  return;
}
```

