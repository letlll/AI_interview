/**
 * electron/main.js
 *
 * Electron PDF 微服务：
 * - 在隐藏 BrowserWindow 中渲染 HTML
 * - 通过 webContents.printToPDF() 生成分页 PDF
 * - 同时启动 Node.js HTTP 服务器 (:9999) 接收前端请求
 *
 * 无需 GUI 窗口，纯后台运行。
 */

const { app, BrowserWindow, webContents } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

const HTTP_PORT = 9999;
const TEMP_DIR = path.join(os.tmpdir(), 'electron-pdf-temp');

// 隐藏 BrowserWindow 尺寸（A4 @ 96dpi）
const A4_WIDTH = 794;
const A4_HEIGHT = 1123;

let mainWindow = null;

/** 创建隐藏窗口（仅用于 PDF 渲染） */
function createWindow() {
  mainWindow = new BrowserWindow({
    width: A4_WIDTH,
    height: A4_HEIGHT,
    show: false,          // 完全隐藏
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,      // 关闭 sandbox 允许加载本地 file://
    },
  });
  return mainWindow;
}

/**
 * 向隐藏窗口写入 HTML，等待渲染完成后生成 PDF。
 * @param {string} html 完整 HTML 字符串（应包含 <style> 和 <body>）
 * @param {object} options { resumeName, marginTop, marginBottom, marginLeft, marginRight }
 * @returns {Promise<Buffer>} PDF 二进制数据
 */
async function generatePdf(html, options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  const win = mainWindow;

  // 截断超长 HTML（>1MB）
  if (html.length > 1024 * 1024) {
    throw new Error(`HTML 内容过长 (${Math.round(html.length / 1024)}KB)，请减少简历内容`);
  }

  // 确保临时目录存在
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 生成唯一文件名
  const fileName = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`;
  const filePath = path.join(TEMP_DIR, fileName);
  fs.writeFileSync(filePath, html, 'utf8');
  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('页面加载超时（15s）')), 15000);
      win.webContents.once('did-finish-load', () => { clearTimeout(timeout); resolve(); });
      win.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
        clearTimeout(timeout);
        reject(new Error(`页面加载失败: ${errorCode} ${errorDescription}`));
      });
      win.loadURL(fileUrl).catch(err => { clearTimeout(timeout); reject(err); });
    });

    // 等待 JS 渲染完成：轮询检测 .resume-document 元素出现且有实际内容
    await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('DOM 内容渲染超时（20s）')), 20000);
        const start = Date.now();
        function poll() {
          const el = document.querySelector('.resume-document') || document.querySelector('.markdown-body');
          const bodyTextLen = document.body ? document.body.textContent.trim().length : 0;
          console.log('[PDF render poll] body text length:', bodyTextLen, 'el children:', el ? el.children.length : 'null');
          const hasContent = el && (el.children.length > 0 || bodyTextLen > 10);
          if (hasContent) {
            clearTimeout(timeout);
            console.log('[PDF render poll] 内容已就绪，body text:', bodyTextLen, 'el children:', el ? el.children.length : 0);
            setTimeout(resolve, 300);
          } else if (Date.now() - start > 18000) {
            console.log('[PDF render poll] 超时前最后一次确认，强制继续');
            resolve();
          } else {
            setTimeout(poll, 100);
          }
        }
        poll();
      })
    `);
  } finally {
    try { fs.unlinkSync(filePath); } catch (_) {}
  }

  // A4 标准尺寸（单位：微米，printToPDF 官方要求）
  // 210mm × 297mm = 210000μm × 297000μm
  const A4_WIDTH_MICRONS = 210000;
  const A4_HEIGHT_MICRONS = 297000;

  console.log(`[Electron PDF] 内容渲染就绪，开始生成 PDF`);
  const { resumeName = '', marginTop = 40, marginBottom = 40, marginLeft = 50, marginRight = 50 } = options;

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    landscape: false,
    pageSize: { width: A4_WIDTH_MICRONS, height: A4_HEIGHT_MICRONS },
    margins: { marginType: 'custom', top: marginTop, bottom: marginBottom, left: marginLeft, right: marginRight },
    displayHeaderFooter: true,
    headerTemplate: `
      <div style="width:100%;font-size:9px;text-align:center;
        font-family:'Microsoft YaHei',SimHei,sans-serif;color:#888;
        border-bottom:1px solid #e8e8e8;padding-bottom:3px;margin-bottom:4px;">
        <span class="title">${escapeHtml(resumeName)}</span>
      </div>`,
    footerTemplate: `
      <div style="width:100%;font-size:9px;text-align:center;
        font-family:'Microsoft YaHei',SimHei,sans-serif;color:#aaa;">
        <span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span>
      </div>`,
  });

  return pdfData;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** HTTP 服务器：接收前端请求 */
function createHttpServer() {
  return new Promise((resolve) => {
    const server = http.createServer(async (req, res) => {
      // CORS headers
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      if (req.method === 'POST' && req.url === '/api/pdf') {
        const MAX_BODY_SIZE = 10 * 1024 * 1024;
        let body = [];
        let bodySize = 0;
        let tooLarge = false;
        req.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) { tooLarge = true; req.destroy(); return; }
          body.push(chunk);
        });
        req.on('end', async () => {
          if (tooLarge) {
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '请求体过大，请减少简历内容后重试' }));
            return;
          }
          try {
            const raw = Buffer.concat(body).toString();
            const { html, options } = JSON.parse(raw);
            console.log(`[Electron PDF] 收到请求，HTML 长度: ${html?.length ?? 0}`);
            const pdfBuffer = await generatePdf(html, options);
            console.log(`[Electron PDF] 生成完成，大小: ${pdfBuffer.length} bytes`);
            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            res.end(pdfBuffer);
          } catch (err) {
            console.error('[Electron PDF] 生成失败:', err.message, err.stack);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'PDF 生成失败' }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'ok' }));
        return;
      }

      res.writeHead(404);
      res.end();
    });

    server.listen(HTTP_PORT, () => {
      console.log(`[Electron PDF 微服务] 运行于 http://localhost:${HTTP_PORT}`);
      resolve(server);
    });
  });
}

// 应用启动
app.whenReady().then(async () => {
  createWindow();
  await createHttpServer();
});

app.on('window-all-closed', () => {
  // 在 macOS 以外，关闭所有窗口时退出应用
  app.quit();
});
