# Electron PDF 微服务使用说明

## 概述

本项目使用 Electron 作为 PDF 导出的后端渲染引擎，通过 Chromium 的 `webContents.printToPDF()` API 生成高质量分页 PDF，替代原有的 `html2canvas + jsPDF` 方案。

**优势：**
- Chromium 原生分页，无像素级截图失真
- 支持页眉（姓名）、页脚（页码）模板
- 字体渲染与浏览器完全一致
- 无需前端处理分页逻辑

---

## 开发模式

### 1. 安装依赖

```bash
cd ai-interview-frontend
npm install
# electron 和 concurrently 会自动安装
```

### 2. 启动服务

**方式一：一键启动（推荐）**

```bash
npm run dev:all
```

这会同时启动：
- Vite 开发服务器（:5173）
- Electron PDF 微服务（:9999）

**方式二：分别启动**

```bash
# 终端 1：前端
npm run dev

# 终端 2：Electron PDF 服务
npm run electron:dev
```

### 3. 验证服务状态

```bash
curl http://localhost:9999/health
# 应返回：{"status":"ok"}
```

---

## 使用方式

### 预览 + 下载（原有流程）

1. 在简历编辑器中点击右上角「打印预览」
2. 点击「确认下载」—— 使用 `html2canvas` 预览图，Electron PDF 下载

### 高质量导出（新增）

点击预览区顶部的「高质量导出」按钮：
- 直接从 MarkdownRenderer 获取渲染 HTML
- 发送给 Electron 微服务
- Chromium 完成分页后返回 PDF 二进制
- 浏览器触发下载

> **注意**：高质量导出依赖 Electron 微服务运行。如服务未启动，会提示 `Electron 服务未启动，请运行 npm run electron:dev 后重试`，并自动 fallback 到原有下载流程。

---

## Fallback 机制

当 Electron 服务不可用时（端口 9999 连接失败），系统自动 fallback 到 `html2canvas + jsPDF`：

```
generatePdfBlob()
  ├─→ generatePdfViaElectron()  ── 失败 ──→ null
  │                                     └─→ html2canvas + jsPDF 兜底
  └─→ 返回 blob + pageImages
```

---

## 可配置参数

在 `electron/main.cjs` 中可修改以下常量：

| 参数 | 默认值 | 说明 |
|---|---|---|
| `HTTP_PORT` | `9999` | Electron HTTP 服务端口 |
| `A4_WIDTH` | `794` | 隐藏窗口宽度（px） |
| `A4_HEIGHT` | `1123` | 隐藏窗口高度（px） |
| `页面加载超时` | `15000ms` | HTML 写入后的最大等待时间 |
| `字体加载等待` | `200ms` | 字体完全渲染的额外等待 |

PDF 边距可通过前端传入 `options` 参数覆盖：

```js
{
  resumeName: '张三',   // 页眉显示的姓名
  marginTop: 40,       // pt
  marginBottom: 40,    // pt
  marginLeft: 50,      // pt
  marginRight: 50,     // pt
}
```

---

## 文件说明

```
electron/
  main.cjs    # Electron 主进程入口 + HTTP 服务器
  preload.js  # contextBridge 安全暴露（预留）
```

---

## 生产打包

Electron 微服务仅用于开发阶段。生产打包时：

- 前端 `npm run build` 生成 `dist/`
- 可使用 `electron-builder` 打包为独立 `.exe`
- Electron 壳内置 Vite 产物，成为独立可执行文件，无需额外进程

---

## API 接口

### POST /api/pdf

生成 PDF。

**请求：**
```json
{
  "html": "<div class=\"resume-document\">...</div>",
  "options": {
    "resumeName": "张三",
    "marginTop": 40,
    "marginBottom": 40,
    "marginLeft": 50,
    "marginRight": 50
  }
}
```

**响应：**
- `200` — `application/pdf` 二进制流
- `500` — `{ "error": "错误信息" }`

### GET /health

健康检查。

**响应：**
```json
{ "status": "ok" }
```
