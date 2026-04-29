/**
 * electron/main.cjs
 *
 * Electron PDF 微服务：
 * - 在隐藏 BrowserWindow 中渲染 HTML
 * - 注入打印锚点（供 PDF 分页解析）
 * - 通过 Chromium printToPDF 生成分页 PDF
 * - 用 pdf-lib 解析 PDF 获取每页 mediabox 高度
 * - 按精确页边界逐页截图（用于预览）
 * - 同时返回预览图 + PDF blob（预览无 header/footer，PDF 有）
 * - 启动 Node.js HTTP 服务器 (:9999) 接收前端请求
 *
 * 无需 GUI 窗口，纯后台运行。
 *
 * 注意：使用 .cjs 后缀强制 CommonJS 模块（package.json 为 "type": "module"）
 */

const { app, BrowserWindow } = require('electron');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');

// 引入 pdf-lib（用于解析 PDF 获取精确分页位置）
const { PDFDocument, PDFName, PDFArray } = require('pdf-lib');

const HTTP_PORT = 9999;
const TEMP_DIR = path.join(os.tmpdir(), 'electron-pdf-temp');

// 隐藏 BrowserWindow 尺寸
// 内容区 .resume-document: max-width:800px + padding:40px*2 = 880px
// 预留 60px 余量（避免边角被裁切），设为 940px 宽
const A4_WIDTH = 940;
const A4_HEIGHT = 1400;

// DPI 和 pt 换算常量（与 Obsidian constant.ts 保持一致）
const MM_PER_INCH = 25.4;
const PT_PER_INCH = 72;
const DPI = 96; // Chromium 默认 DPI

// A4 尺寸（mm）
const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;

let mainWindow = null;
// 最近一次 generatePdfPreview 生成的原始 PDF 数据（供 /api/parsedebug 使用）
let lastPdfData = null;

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

/** 等待指定毫秒（对应 Obsidian utils.ts sleep） */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 向 HTML 注入 CSS @page 规则，使 Chromium printToPDF 按 A4 分页。
 *
 * 关键：Chromium 的 pageSize 选项只决定每个 Page 的 MediaBox 尺寸，
 * 不自动在内容满页时插入分页符。必须在 CSS 中声明 @page { size: A4 }
 * 并用 page-break-* 类控制断点，否则所有内容会溢出到单页。
 *
 * @param {string} html
 * @param {number} marginTop
 * @param {number} marginBottom
 * @param {number} marginLeft
 * @param {number} marginRight
 * @returns {string} 注入后的 HTML
 */
function injectPageCss(html, marginTop, marginBottom, marginLeft, marginRight) {
  const pageCss = `
<style>
@page {
  size: A4;
  margin: ${marginTop}px ${marginRight}px ${marginBottom}px ${marginLeft}px;
}
@page :first {
  margin-top: 0;  /* 补偿 .resume-document padding-top: 40px */
}
/* 避免标题被分割到两页 */
h1, h2, h3, h4, h5, h6 {
  page-break-after: avoid;
}
/* 图片和表格尽量不分割 */
img, table, pre {
  page-break-inside: avoid;
}
/* 分页保留标记元素视觉隐藏（不影响打印分页逻辑） */
.page-break-before {
  page-break-before: always;
}
</style>
`;

  // 追加到 <head> 结尾；若没有 </head> 则直接追加到 body 前
  if (html.includes('</head>')) {
    return html.replace('</head>', pageCss + '</head>');
  } else if (html.includes('<body')) {
    return html.replace(/<body/i, pageCss + '<body');
  } else {
    return pageCss + html;
  }
}

/**
 * 向隐藏窗口写入 HTML，等待渲染完成后注入打印锚点。
 * 对应 Obsidian render.ts 的 fixDoc + utils.ts 的 modifyDest。
 *
 * @param {string} html 完整 HTML 字符串（应包含 <style> 和 <body>）
 * @returns {Promise<void>}
 */
async function loadHtmlWithAnchors(html, options = {}) {
  const {
    marginTop = 40,
    marginBottom = 40,
    marginLeft = 50,
    marginRight = 50,
  } = options;

  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  const win = mainWindow;

  // 截断超长 HTML（>1MB）防止 data URL 溢出
  if (html.length > 1024 * 1024) {
    throw new Error(`HTML 内容过长 (${Math.round(html.length / 1024)}KB)，请减少简历内容`);
  }

  // 确保临时目录存在
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  // 生成唯一文件名（避免并发冲突）
  const fileName = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`;
  const filePath = path.join(TEMP_DIR, fileName);

  // 写入临时 HTML 文件之前，注入 @page 规则强制 Chromium 按 A4 分页
  // Chromium 的 pageSize 选项只决定 MediaBox 尺寸，不自动分页；
  // 必须配合 CSS @page { size: A4 } 和 page-break-* 才会在 PDF 中真正分页
  html = injectPageCss(html, marginTop, marginBottom, marginLeft, marginRight);

  // 写入临时 HTML 文件
  fs.writeFileSync(filePath, html, 'utf8');
  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`; // Windows 反斜杠转正斜杠

  try {
    // 等待页面完全加载
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('页面加载超时（15s）')), 15000);

      win.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve();
      });
      win.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
        clearTimeout(timeout);
        reject(new Error(`页面加载失败: ${errorCode} ${errorDescription}`));
      });

      win.loadURL(fileUrl).catch(err => {
        clearTimeout(timeout);
        reject(new Error(`loadURL 失败: ${err.message}`));
      });
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
          const hasContent = el && (
            el.children.length > 0 ||
            bodyTextLen > 10
          );
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

    // ========== 注入打印锚点（供 PDF 分页解析使用） ==========
    // 为每个 h1-h6 和主要区块注入锚点（<a href="af://{flag}">），
    // flag 格式：h2-{index}-{textHash}，textHash = heading text 的 hash
    await win.webContents.executeJavaScript(`
      (function() {
        var counter = 0;
        function hashStr(str) {
          // 简单 hash：取文本前 16 字符的 charCode 和
          var s = str.trim().substring(0, 16);
          var h = 0;
          for (var i = 0; i < s.length; i++) {
            h = ((h << 5) - h) + s.charCodeAt(i);
            h = h & h;
          }
          return Math.abs(h).toString(36);
        }
        var headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6, .section, .subsection');
        headings.forEach(function(el) {
          if (el.querySelector('.md-print-anchor')) return;
          var a = document.createElement('a');
          var tag = el.tagName ? el.tagName.toLowerCase() : 'block';
          var text = el.textContent ? el.textContent.trim() : '';
          var hash = hashStr(text);
          var flag = tag + '-' + (++counter) + '-' + hash;
          a.href = 'af://' + flag;
          a.className = 'md-print-anchor';
          // 视觉上不可见，但 Chromium 会为其创建 PDF Link 注解
          a.style.cssText = 'position:absolute;width:1px;height:1px;right:0;overflow:hidden;display:inline-block;';
          el.appendChild(a);
        });
        console.log('[injectPrintAnchors] 注入锚点数量:', counter);
      })();
    `);

  } finally {
    // 清理临时文件（忽略删除失败）
    try { fs.unlinkSync(filePath); } catch (_) {}
  }
}

/**
 * 等待渲染稳定
 * @param {BrowserWindow} win
 */
async function waitForRender(win) {
  await sleep(1000);
}

/**
 * 解析 PDF 获取每页的 mediabox 高度。
 *
 * @param {PDFDocument} pdfDoc - pdf-lib PDFDocument 实例
 * @returns {Array<{pageIndex: number, heightPt: number, mediaboxBottom: number, mediaboxTop: number}>}
 */
function parsePdfPageBreaks(pdfDoc) {
  const pages = pdfDoc.getPages();
  const pageBreaks = [];

  for (let i = 0; i < pages.length; i++) {
    const page = pages[i];

    // pdf-lib getHeight()/getWidth() 返回微米（μm），不是点
    // 微米 / 1000 = 毫米；毫米 / 25.4 * 72 = 点
    const heightPt = page.getHeight() / 1000 / 25.4 * 72;
    const widthPt  = page.getWidth()  / 1000 / 25.4 * 72;

    console.log(`[parsePdfPageBreaks] 页 ${i + 1}: width=${widthPt.toFixed(2)}pt, height=${heightPt.toFixed(2)}pt`);

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

/**
 * 按 PDF 精确页边界逐页截图（用于预览图）。
 *
 * 策略：scroll + resize + capturePage 逐页截图。
 * Chromium capturePage() 截取的是当前视口可见区域，
 * 配合 windowHeight 调整可精确控制每页截取范围。
 *
 * 注意：DOM 中无 header/footer，所以截图预览天然无页码。
 *
 * @param {BrowserWindow} win
 * @param {Array} pageBreaks - parsePdfPageBreaks 返回的页边界数组
 * @returns {Promise<Array<string>>} 每页 base64 PNG 字符串数组
 */
async function capturePageImagesByPdfBreaks(win, pageBreaks) {
  // A4 内容区尺寸（px，96 DPI）
  // A4 纸宽 210mm → 794pt → 1058px（等于视口宽）
  // A4 纸高 841.89pt → 1123px（每页固定内容高）
  const ptToPx = 96 / 72;
  const A4ContentWidthPx = 1058;
  const A4ContentHeightPx = Math.ceil(841.89 * ptToPx); // ≈ 1123

  // 先让窗口高度匹配 DOM 总内容高度，确保 CSS 分页布局全部就位
  const domScrollHeight = await win.webContents.executeJavaScript(
    'document.body.scrollHeight'
  );
  await win.setContentSize(A4ContentWidthPx, domScrollHeight + 200);
  await sleep(300);

  const pageImages = [];

  for (let i = 0; i < pageBreaks.length; i++) {
    // 使用正确的 heightPt（点）→ 像素，与 PDF 实际每页高度精确对应
    const scrollY = Math.round(i * A4ContentHeightPx);

    await win.webContents.executeJavaScript('window.scrollTo(0, ' + scrollY + ')');
    await sleep(400);

    // 视口高度固定为 A4 内容高 + 50px；capturePage 只截视口可见区
    await win.setContentSize(A4ContentWidthPx, A4ContentHeightPx + 50);
    await sleep(300);

    const screenshot = await win.webContents.capturePage();
    const pngBase64 = screenshot.toPNG().toString('base64');
    console.log('[capturePageImages] 第' + (i + 1) + '页截图大小:', pngBase64.length, 'bytes');
    pageImages.push('data:image/png;base64,' + pngBase64);
  }

  // 恢复窗口高度（供下次使用）
  await win.setContentSize(A4ContentWidthPx, A4ContentHeightPx + 200);
  await sleep(100);

  return pageImages;
}

/**
 * 核心函数：生成 PDF 预览（同时返回预览图 + PDF）。
 * 对应 Obsidian 精确分页方案 + 前端 /api/preview 接口。
 *
 * 关键设计：
 * - 预览图（pageImages）：HTML 截图，displayHeaderFooter: false，无页码 header/footer
 * - 最终 PDF（pdfBase64）：Chromium printToPDF，displayHeaderFooter: true，有页码
 * - 两者使用同一套渲染基准（一致的字体、布局、分页），用户可接受细微差异
 *
 * @param {string} html 完整 HTML 字符串（含内联 CSS）
 * @param {object} options { resumeName, marginTop, marginBottom, marginLeft, marginRight, displayHeader, headerTemplate, footerTemplate }
 * @returns {Promise<{pageImages: string[], pdfBase64: string, pageCount: number, pageBreaks: number[]}>}
 */
async function generatePdfPreview(html, options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  const win = mainWindow;
  const { resumeName = '', marginTop = 40, marginBottom = 40, marginLeft = 50, marginRight = 50,
    displayHeaderFooter = true, headerTemplate, footerTemplate } = options;

  console.log('[generatePdfPreview] 开始生成预览，HTML ��度:', html.length);

  // 1. 加载 HTML 并注入锚点（对应 Obsidian renderMarkdown + fixDoc + modifyDest）
  await loadHtmlWithAnchors(html, { marginTop, marginBottom, marginLeft, marginRight });

  // 2. 等待渲染稳定
  await waitForRender(win);

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

  // ============================================================
  // 3. 生成 PDF（Chromium 分页的权威来源）
  //    displayHeaderFooter: true 让 PDF 有页码 header/footer
  //    对应 Obsidian exportToPDF 的 printOptions
  // ============================================================
  const DEFAULT_HEADER_TEMPLATE = `
    <div style="width:100%;font-size:9px;text-align:center;
      font-family:'Microsoft YaHei',SimHei,sans-serif;color:#888;
      padding-bottom:3px;margin-bottom:4px;">
      <span class="title">${escapeHtml(resumeName)}</span>
    </div>`;
  const DEFAULT_FOOTER_TEMPLATE = `
    <div style="width:100%;font-size:9px;text-align:center;
      font-family:'Microsoft YaHei',SimHei,sans-serif;color:#aaa;">
      <span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span>
    </div>`;

  // pageSize 单位：英寸（Electron 官方要求）；margins 单位：英寸（CSS 像素 / 96）
  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    landscape: false,
    pageSize: {
      width: A4_WIDTH_MM / 25.4,
      height: A4_HEIGHT_MM / 25.4,
    },
    margins: {
      marginType: 'custom',
      top: marginTop / 96,
      bottom: marginBottom / 96,
      left: marginLeft / 96,
      right: marginRight / 96,
    },
    displayHeaderFooter: displayHeaderFooter,
    headerTemplate: headerTemplate ?? DEFAULT_HEADER_TEMPLATE,
    footerTemplate: footerTemplate ?? DEFAULT_FOOTER_TEMPLATE,
  });

  console.log('[generatePdfPreview] PDF 生成完成，大小:', pdfData.length, 'bytes');

  // 保存最近一次 PDF 数据供 /api/parsedebug 使用
  lastPdfData = pdfData;

  // ========== 调试：printToPDF 后立即 capturePage 对比 ==========
  {
    const debugScreenshot = await win.webContents.capturePage();
    const debugPng = debugScreenshot.toPNG();
    console.log('[DEBUG] capturePage PNG 大小:', debugPng.length, 'bytes');
    console.log('[DEBUG] capturePage PNG 前 8 bytes:', debugPng.slice(0, 8).toString('hex'));
    // 如果两者大小相近但 PDF 空白，说明 printToPDF 在这次调用时页面未就绪
  }

  // ============================================================
  // 4. 解析 PDF 分页结构（获取每页 mediabox 高度）
  // ============================================================
  const pdfDoc = await PDFDocument.load(pdfData);
  const pageBreaks = parsePdfPageBreaks(pdfDoc);
  const pageCount = pageBreaks.length;
  console.log('[generatePdfPreview] PDF 页数:', pageCount);
  console.log('[generatePdfPreview] 每页 mediabox 高度（pt）:', pageBreaks.map(p => p.heightPt));

  // ============================================================
  // 5. 按精确页边界截图（预览图，无 header/footer）
  //    capturePage() 直接截取 DOM 可见区域，DOM 中无 header/footer
  // ============================================================
  const pageImages = await capturePageImagesByPdfBreaks(win, pageBreaks);
  console.log('[generatePdfPreview] 预览截图生成完成，数量:', pageImages.length);

  // 6. 返回结果（pdfBase64 使用原始 pdfData，不走 pdfDoc.save()，
  //    因为 pdf-lib 的 save() 会丢弃 Chromium header/footer 注解，导致 PDF 空白）
  return {
    pageImages,                                     // 每页 base64 PNG 预览（无 header/footer）
    pdfBase64: Buffer.from(pdfData).toString('base64'),    // 原始 printToPDF 输出（含 header/footer）
    pageCount,
    pageBreaks: pageBreaks.map(p => parseFloat(p.heightPt.toString())),
  };
}

/**
 * 原有 PDF 生成函数（保持不变，用于直接下载 PDF）。
 * 对应 Obsidian exportToPDF（不含预览截图逻辑）。
 *
 * @param {string} html 完整 HTML 字符串（含内联 CSS）
 * @param {object} options { resumeName, marginTop, marginBottom, marginLeft, marginRight, displayHeader, headerTemplate, footerTemplate }
 * @returns {Promise<Buffer>} PDF 二进制数据
 */
async function generatePdf(html, options = {}) {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  }

  const win = mainWindow;

  if (html.length > 1024 * 1024) {
    throw new Error(`HTML 内容过长 (${Math.round(html.length / 1024)}KB)，请减少简历内容`);
  }

  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  const fileName = `resume-${Date.now()}-${Math.random().toString(36).slice(2, 8)}.html`;
  const filePath = path.join(TEMP_DIR, fileName);

  fs.writeFileSync(filePath, html, 'utf8');
  const fileUrl = `file://${filePath.replace(/\\/g, '/')}`;

  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('页面加载超时（15s）')), 15000);

      win.webContents.once('did-finish-load', () => {
        clearTimeout(timeout);
        resolve();
      });
      win.webContents.once('did-fail-load', (_event, errorCode, errorDescription) => {
        clearTimeout(timeout);
        reject(new Error(`页面加载失败: ${errorCode} ${errorDescription}`));
      });

      win.loadURL(fileUrl).catch(err => {
        clearTimeout(timeout);
        reject(new Error(`loadURL 失败: ${err.message}`));
      });
    });

    await win.webContents.executeJavaScript(`
      new Promise((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('DOM 内容渲染超时（20s）')), 20000);
        const start = Date.now();
        function poll() {
          const el = document.querySelector('.resume-document') || document.querySelector('.markdown-body');
          const bodyTextLen = document.body ? document.body.textContent.trim().length : 0;
          const hasContent = el && (
            el.children.length > 0 ||
            bodyTextLen > 10
          );
          if (hasContent) {
            clearTimeout(timeout);
            setTimeout(resolve, 300);
          } else if (Date.now() - start > 18000) {
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

  console.log(`[Electron PDF] 内容渲染就绪，开始生成 PDF`);

  const { resumeName = '', marginTop = 40, marginBottom = 40, marginLeft = 50, marginRight = 50,
    displayHeader = true, headerTemplate, footerTemplate } = options;

  const DEFAULT_HEADER_TEMPLATE = `
    <div style="width:100%;font-size:9px;text-align:center;
      font-family:'Microsoft YaHei',SimHei,sans-serif;color:#888;
      border-bottom:1px solid #e8e8e8;padding-bottom:3px;margin-bottom:4px;">
      <span class="title">${escapeHtml(resumeName)}</span>
    </div>`;
  const DEFAULT_FOOTER_TEMPLATE = `
    <div style="width:100%;font-size:9px;text-align:center;
      font-family:'Microsoft YaHei',SimHei,sans-serif;color:#aaa;">
      <span class="pageNumber"></span>&nbsp;/&nbsp;<span class="totalPages"></span>
    </div>`;

  const pdfData = await win.webContents.printToPDF({
    printBackground: true,
    landscape: false,
    pageSize: {
      width: A4_WIDTH_MM / 25.4,
      height: A4_HEIGHT_MM / 25.4,
    },
    margins: {
      marginType: 'custom',
      top: marginTop / 96,
      bottom: marginBottom / 96,
      left: marginLeft / 96,
      right: marginRight / 96,
    },
    displayHeaderFooter: displayHeader,
    headerTemplate: headerTemplate ?? DEFAULT_HEADER_TEMPLATE,
    footerTemplate: footerTemplate ?? DEFAULT_FOOTER_TEMPLATE,
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
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

      if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
      }

      // ============================================================
      // 接口 1：POST /api/preview
      // 完整流程：渲染 → 锚点注入 → PDF(Chromium分页) → pdf-lib解析 → 精确截图
      // 返回预览图 + PDF blob + 分页信息
      // ============================================================
      if (req.method === 'POST' && req.url === '/api/preview') {
        const MAX_BODY_SIZE = 10 * 1024 * 1024;
        let body = [];
        let bodySize = 0;
        let tooLarge = false;

        req.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) {
            tooLarge = true;
            req.destroy();
            return;
          }
          body.push(chunk);
        });

        req.on('end', async () => {
          if (tooLarge) {
            console.error('[Electron PDF] 请求体过大:', bodySize);
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '请求体过大，请减少简历内容后重试' }));
            return;
          }

          try {
            const raw = Buffer.concat(body).toString();
            const { html, options } = JSON.parse(raw);
            console.log(`[Electron PDF /api/preview] HTML 长度: ${html?.length ?? 0}`);

            const result = await generatePdfPreview(html, options);
            console.log(`[Electron PDF /api/preview] 生成完成，预览 ${result.pageCount} 页，PDF 大小: ${result.pdfBase64.length} bytes`);

            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(result));
          } catch (err) {
            console.error('[Electron PDF /api/preview] 生成失败:', err.message, err.stack);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || '预览生成失败' }));
          }
        });
        return;
      }

      // ============================================================
      // 接口 2：POST /api/pdf
      // 原有逻辑不变，返回纯 PDF binary
      // ============================================================
      if (req.method === 'POST' && req.url === '/api/pdf') {
        const MAX_BODY_SIZE = 10 * 1024 * 1024;
        let body = [];
        let bodySize = 0;
        let tooLarge = false;

        req.on('data', chunk => {
          bodySize += chunk.length;
          if (bodySize > MAX_BODY_SIZE) {
            tooLarge = true;
            req.destroy();
            return;
          }
          body.push(chunk);
        });

        req.on('end', async () => {
          if (tooLarge) {
            console.error('[Electron PDF] 请求体过大:', bodySize);
            res.writeHead(413, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '请求体过大，请减少简历内容后重试' }));
            return;
          }

          try {
            const raw = Buffer.concat(body).toString();
            const { html, options } = JSON.parse(raw);
            console.log(`[Electron PDF /api/pdf] HTML 长度: ${html?.length ?? 0}`);
            const pdfBuffer = await generatePdf(html, options);
            console.log(`[Electron PDF /api/pdf] 生成完成，大小: ${pdfBuffer.length} bytes`);
            res.writeHead(200, { 'Content-Type': 'application/pdf' });
            res.end(pdfBuffer);
          } catch (err) {
            console.error('[Electron PDF /api/pdf] 生成失败:', err.message, err.stack);
            res.writeHead(500, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: err.message || 'PDF 生成失败' }));
          }
        });
        return;
      }

      if (req.method === 'GET' && req.url === '/api/debug') {
        try {
          if (!mainWindow || mainWindow.isDestroyed()) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: 'Electron 窗口未就绪，请先调用 /api/preview' }));
            return;
          }
          const win = mainWindow;
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

      if (req.method === 'GET' && req.url === '/api/parsedebug') {
        try {
          if (!lastPdfData) {
            res.writeHead(400, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ error: '暂无 PDF 数据，请先调用 /api/preview' }));
            return;
          }
          const pdfDoc = await PDFDocument.load(Buffer.from(lastPdfData));
          const pages = pdfDoc.getPages();
          const raw = pages.map((page, i) => {
            const heightPt = page.getHeight();
            const widthPt = page.getWidth();
            return {
              page: i + 1,
              bounds: { x1: 0, y1: 0, x2: widthPt, y2: heightPt },
              heightPt: heightPt,
              widthPt: widthPt,
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
      console.log(`  - POST /api/preview  → 预览图 + PDF blob + 分页信息`);
      console.log(`  - POST /api/pdf      → 纯 PDF binary（原有逻辑）`);
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
  app.quit();
});
