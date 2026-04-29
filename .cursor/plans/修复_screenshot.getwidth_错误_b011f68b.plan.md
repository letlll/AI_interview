---
name: 修复 screenshot.getWidth 错误
overview: 诊断并修复 Electron 服务持续报 screenshot.getWidth is not a function 错误的根本原因，确保修复后的代码正确执行。
todos:
  - id: restart-electron
    content: 确认 Electron 服务已完全重启
    status: pending
  - id: add-defensive-check
    content: 添加防御性检查：如果 screenshot 无效则打印诊断信息
    status: pending
isProject: false
---

## 问题分析

经过对 `main.cjs` 的逐字节验证，文件代码完全正确：

- 第 337 行：`const screenshot = await win.webContents.capturePage();`
- 第 338 行：`const rawWidth = screenshot.getWidth();`

但错误日志显示 `main.cjs:337:34`（列 34 正好是 `.getWidth()` 的位置），证明 Electron 进程仍在执行**旧代码**（在修复 `screenshot.resize()` 原地修改 bug 之前的版本）。

错误原因链：

1. `capturePageImagesByPdfBreaks` 中第一次 `screenshot.resize()` 被写成了 `const scaled = screenshot.resize(...)`，返回 `undefined`，但代码仍继续执行到 `capturePageImagesByPdfBreaks`（第一次错误不崩）
2. 第二次调用 `capturePageImagesByPdfBreaks` 时，`screenshot` 在某些情况下可能是 `null` 或非 `NativeImage` 对象，导致 `.getWidth()` 报错
3. 或者更可能：**Electron 服务根本没有重启**，仍在运行旧的 `main.cjs`

## 行动计划

### 第一步：确保 Electron 服务正确重启

请在终端中执行以下命令，确认进程已完全终止并重新启动：

```bash
# 1. 找到并杀掉所有 electron 进程
taskkill /F /IM electron.exe /T
# 或如果用 node 运行：
taskkill /F /IM node.exe /T

# 2. 等待 3 秒后重新启动
node "g:/documents/GitHub/AI_interview/ai-interview-frontend/electron/main.cjs"
```

### 第二步（如果第一步之后仍然报错）

在 `capturePage` 调用前后增加防御性检查：

[ai-interview-frontend/electron/main.cjs](ai-interview-frontend/electron/main.cjs)

```js
// 第 336-339 行，替换为：
const screenshot = await win.webContents.capturePage();
if (!screenshot || typeof screenshot.getWidth !== 'function') {
  console.error('[capturePageImages] capturePage() 返回无效对象:', screenshot, new Error().stack);
  throw new Error('capturePage() failed: screenshot is ' + typeof screenshot);
}
const rawWidth  = screenshot.getWidth();
const rawHeight = screenshot.getHeight();
```

这样即使服务未正确重启，也能看到 `screenshot` 实际返回的值是什么。

### 第三步：验证

重启后刷新前端页面，重新生成预览。预期日志：

```
[capturePageImages] 当前 DPR: 2
[capturePageImages] 第1页截图: 物理 1788x2262 → 逻辑 894x1131
```

## 待确认

重启 Electron 服务后再试一次。如果仍然报同样的错，请告知，我会立即执行第二步的防御性修改。