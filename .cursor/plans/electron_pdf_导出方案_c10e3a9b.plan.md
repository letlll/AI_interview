---
name: Electron PDF 导出方案
overview: 用 Electron printToPDF 替换 html2canvas+jsPDF，零侵入后端。核心思路：Node.js 微服务监听 :9999，前端 POST HTML 字符串过去，Electron 在隐藏 BrowserWindow 内完成分页渲染，返回 PDF 二进制数据。
todos:
  - id: electron-main
    content: 新建 electron/main.js — Node.js HTTP 服务 + printToPDF
    status: completed
  - id: electron-preload
    content: 新建 electron/preload.js — contextBridge 安全暴露
    status: completed
  - id: pkg-json
    content: 修改 package.json — 添加 electron 依赖和启动脚本
    status: completed
  - id: pdf-pageview
    content: 修改 PdfPageView.vue — generatePdfBlob 优先 Electron，fallback 原逻辑
    status: completed
  - id: resume-new
    content: 修改 ResumeGeneratorNew.vue — 新增 downloadViaElectron 高质量导出入口
    status: completed
  - id: docs
    content: 新建 docs/ELECTRON_PDF_SETUP.md — 使用说明文档
    status: completed
isProject: false
---

## 整体架构

```
Vue 组件                      Electron 主进程 (:9999)
  │                                    │
  │  1. 触发导出                      │
  │    POST /api/pdf                   │
  │    body: { html, options }  ────▶  │
  │                                    │  2. 写入隐藏 BrowserWindow
  │                                    │  3. webContents.printToPDF()
  │                                    │     (Chromium 引擎分页，页眉/页脚模板)
  │    ◀──────── PDF bytes (200)       │
  │                                    │
  │  4. Blob → 预览弹窗 + 下载
```

---

## 文件改动总览


| 文件                                                            | 操作  |
| ------------------------------------------------------------- | --- |
| `ai-interview-frontend/electron/main.js`                      | 新增  |
| `ai-interview-frontend/electron/preload.js`                   | 新增  |
| `ai-interview-frontend/package.json`                          | 修改  |
| `ai-interview-frontend/src/components/common/PdfPageView.vue` | 修改  |
| `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`      | 修改  |


Django 后端代码**零改动**。

---

## Step 1 — 新增 Electron 服务入口

新建 `ai-interview-frontend/electron/main.js`：

- 导入 `electron`、原生 `http`、`path`
- 创建隐藏 BrowserWindow（794×1123px，`show: false`）
- 在主进程启动时同时启动 Node.js HTTP 服务器（`:9999`）
- 监听 `POST /api/pdf`：读取 body 中的 HTML 字符串，写入 BrowserWindow，调用 `webContents.printToPDF()`，返回 PDF bytes
- 支持 `OPTIONS` CORS 预检

关键 `printToPDF` 参数（与 Obsidian better-export-pdf 一致）：

```js
win.webContents.printToPDF({
  printBackground: true,
  landscape: false,
  pageSize: { width: 595.28, height: 841.89 }, // A4 pt
  margins: {
    marginType: 'custom',
    top:    options.marginTop    ?? 40,
    bottom: options.marginBottom ?? 40,
    left:   options.marginLeft   ?? 50,
    right:  options.marginRight  ?? 50,
  },
  displayHeaderFooter: true,
  headerTemplate: `<div style="width:100%;font-size:10px;text-align:center;
    font-family:'Microsoft YaHei',sans-serif;color:#666;border-bottom:1px solid #e0e0e0;
    padding-bottom:4px;margin-bottom:4px;"><span class="title">${resumeName}</span></div>`,
  footerTemplate: `<div style="width:100%;font-size:10px;text-align:center;
    font-family:'Microsoft YaHei',sans-serif;color:#999;">
    <span class="pageNumber"></span> / <span class="totalPages"></span></div>`,
})
```

---

## Step 2 — 新增 preload 脚本

新建 `ai-interview-frontend/electron/preload.js`：

- `contextBridge` 暴露 `electronPDF` API（可选，防止 Electron 未启动时前端报错）
- 提供 `isElectronAvailable()` 健康检查方法

---

## Step 3 — 修改 `PdfPageView.vue`

当前 `generatePdfBlob()` 使用 `html2canvas` + `jsPDF` 生成 PDF。将其改为调用 Electron 服务：

```ts
// 新增：调用 Electron PDF 微服务
const generatePdfViaElectron = async (
  html: string,
  options: object
): Promise<Blob | null> => {
  try {
    const res = await fetch('http://localhost:9999/api/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, options }),
    });
    if (!res.ok) throw new Error(await res.text());
    const buffer = await res.arrayBuffer();
    return new Blob([buffer], { type: 'application/pdf' });
  } catch (err) {
    console.warn('[PdfPageView] Electron PDF 服务不可用，fallback 到 html2canvas', err);
    return null; // 触发 fallback
  }
};

// 修改 generatePdfBlob：优先 Electron，fallback 到原 html2canvas 逻辑
const generatePdfBlob = async () => {
  const html = contentRef.value?.innerHTML ?? '';
  const electronBlob = await generatePdfViaElectron(html, {
    resumeName: exportTitle,
    marginTop: 40,
    marginBottom: 40,
    marginLeft: 50,
    marginRight: 50,
  });

  if (electronBlob) {
    // Electron 成功：返回 blob 和空 pageImages（预览继续用 html2canvas 分页图）
    return { blob: electronBlob, pageImages: [] };
  }

  // Fallback：原 html2canvas 逻辑不变
  // ...（完整保留现有代码）
};
```

> **注意**：`pageImages` 返回空数组时，调用方 `ResumeGeneratorNew.vue` 的预览弹窗仍用原 html2canvas 渲染的分页图，下载按钮用 Electron 返回的高质量 PDF。两者体验一致，但下载的文件质量更高。

---

## Step 4 — 修改 `ResumeGeneratorNew.vue`

将 `openPreviewModal()` 中的下载部分拆分：

```ts
// 新增：Electron 下载（绕过预览弹窗，直接下载高质量 PDF）
const downloadViaElectron = async () => {
  const html = markdownRendererRef.value?.$el?.innerHTML ?? '';
  const res = await fetch('http://localhost:9999/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ html, options: { resumeName: exportTitle.value } }),
  });
  if (!res.ok) { ElMessage.error('PDF 导出失败'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `简历-${exportTitle.value}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
};
```

在模板的下载按钮处增加一个「高质量导出」选项，优先调用 `downloadViaElectron`。

---

## Step 5 — 修改 `package.json`

```json
{
  "scripts": {
    "electron:dev": "electron electron/main.js",
    "dev:all": "concurrently \"npm run dev\" \"npm run electron:dev\""
  },
  "devDependencies": {
    "electron": "^33.0.0"
  }
}
```

---

## Step 6 — 文档

在项目根 `docs/` 下新建 `ELECTRON_PDF_SETUP.md`，说明：

- dev 模式启动命令（`npm run dev:all`）
- PDF 服务端口及可配置项
- fallback 机制说明

---

## 开发阶段启动流程

```bash
# 终端 1：Vite 前端
npm run dev

# 终端 2：Electron PDF 服务
npm run electron:dev
# 或一键并发
npm run dev:all
```

---

## 生产打包（Electron 壳）

`electron-builder` 将前端构建产物（`dist/`）打入 `.exe`，打包后 Electron 壳内置 Vite 产物，成为独立可执行文件，无需任何额外进程。