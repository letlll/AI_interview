---
name: 创建 PDF 实时差异化渲染测试页面
overview: 在 Test/ 目录下新增两个 HTML 测试文件，用于验证 Electron PDF API 的实时渲染和差异化渲染策略。继承自 test-pdf-api.html 的接口和样式，增加实时编辑、变更检测和渲染路径差异化的完整测试能力。
todos:
  - id: create-change-detector
    content: 创建 Test/change-detector.js — 变更类型检测工具
    status: completed
  - id: create-realtime-test
    content: 创建 Test/test-pdf-realtime.html — 实时+差异化渲染主测试页面
    status: completed
  - id: update-api-test
    content: 更新原 test-pdf-api.html（可选：补充说明注释指向新测试页）
    status: completed
isProject: false
---

## 创建文件

### 1. `Test/change-detector.js`

**用途**：变更类型检测工具，供 `test-pdf-realtime.html` 引用

核心函数：

- `detectChangeType(oldHtml, newHtml)` — 返回 `'none'|'text'|'structure'`，附带原因说明
  - `structure`：结构性 class 变化（section/div/table/ul）、CSS 属性（font-size/margin/padding/width）、主题切换、长度变化 >200 字符
  - `text`：其余内容变化
  - `none`：完全相同
- `computeDiffStats(oldHtml, newHtml)` — 返回 `{added, removed, unchanged, changePercent}` 差异统计

### 2. `Test/test-pdf-realtime.html`

**用途**：实时渲染 + 差异化渲染的主测试页面，替代 `test-pdf-api.html` 用于生产验证

页面结构（左右分栏）：

**左侧：编辑器面板**

- 可编辑的 HTML textarea（带 syntax highlighting 颜色区分）
- 操作按钮：文本变更、结构调整（分别对应两种渲染路径）
- 实时差异统计显示（变更类型、字数变化百分比）
- 渲染策略指示器（当前走 DOM 还是 Electron）

**右侧：预览面板**

- **DOM 预览区**：用 `<iframe srcdoc>` 实时渲染 HTML，`< 100ms` 更新
  - 渲染时在 iframe 内部注入 CSS 分页样式 `@page { size: A4; }`，模拟 PDF 效果
  - 无 header/footer，只做布局预览
- **Electron 预览区**：调用 `POST /api/preview`，显示 pageImages
  - 标注每页截图尺寸（CSS 像素 vs 物理像素）
  - 标注 `pageBreaks` 中的 `heightPt` 换算

**核心功能**

(a) **差异化渲染演示**

```
用户编辑 → 变更检测（change-detector.js）
    ├─ type='text' → DOM iframe 预览（绿色标签 "轻量 DOM"，<500ms）
    └─ type='structure' → Electron 预览（蓝色标签 "精确 Electron"，2-4s）
```

点击按钮时可同时观察：DOM 预览即时更新 vs Electron 预览有延迟

(b) **实时预览（无 API）**
编辑区每 300ms 防抖更新 iframe srcdoc，不调用 API，用于快速反馈

(c) **精确预览（调 API）**

- DOM 预览更新后，1.5s 防抖自动触发 `/api/preview` 获取 Electron 截图
- 手动"精确预览"按钮可立即触发
- 标注 API 响应时间

(d) **尺寸调试信息**

```
[DOM 渲染]
  视口宽度：xxx px
  A4 宽度（794px @ 96dpi）
  每页高度（1123px @ 96dpi）

[Electron 渲染]
  BrowserWindow container：xxx px
  devicePixelRatio：x.xx
  CSS 像素：xxx px
  pageBreaks 数组：[xxx, xxx, xxx]（每页 heightPt 换算后）
```

**参考 Obsidian 实现的要点**

- 注入 `@page { size: A4; margin: ... }` CSS 规则用于 iframe 内部分页模拟
- Obsidian 的 `constant.ts` 定义 `PageSize.A4 = [210, 297]`（mm）
- Obsidian 的 `render.ts` 在导出前做 `fixCanvasToImage`（canvas 转 img），截图测试页面也做了等效处理

### 3. 更新 `Test/test-pdf-api.html`

保留原文件不动，作为基础功能测试使用。

### 依赖关系

- `test-pdf-realtime.html` 引用 `sample.js`、`sample-3pages.js`（已有）
- `test-pdf-realtime.html` 引用 `change-detector.js`（新建）
- 两个测试页面共享同一 Electron API：`POST http://localhost:9999/api/preview`

