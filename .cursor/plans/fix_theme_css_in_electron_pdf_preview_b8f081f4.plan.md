---
name: Fix theme CSS in Electron PDF preview
overview: 在 markdownToHtml() 和 handleRefreshElectronPreview() 中添加 console.log 调试，确认 themeClass 值和 extraStyles 内容，然后删除冲突的 reset 块，确保主题色正确应用到 Electron PDF 预览。
todos:
  - id: add-log-handle
    content: 在 handleRefreshElectronPreview() 添加 console.log 调试日志
    status: pending
  - id: add-log-mth
    content: 在 markdownToHtml() 函数入口添加 console.log
    status: pending
  - id: delete-reset
    content: 删除 line 1917-1925 的 reset 块
    status: pending
  - id: verify-fix
    content: 验证修复效果
    status: in_progress
isProject: false
---

## 问题描述

用户在 Electron PDF 精确预览中看不到任何颜色（蓝色或其他主题色）。需要添加调试日志确认根因，然后修复。

## 根因分析

通过追踪代码发现：

1. `getThemeCss(themeClass)` 逻辑正确 — 返回硬编码 hex 色值，selector specificity 正确（`.resume-document.theme-blue` 覆盖 `.resume-document`）
2. `resumeMarkdownRaw` 包含完整 CSS（包含主题变量定义）
3. 关键：`ResumeGeneratorNew.vue` 文件中 line 1917-1925 的 reset 块仍然存在（`max-width: unset !important` 等），需要确认是否已删除
4. `themeClass` 的实际值需要通过 console.log 确认

## 修改步骤

### Step 1: 在 `handleRefreshElectronPreview()` 中添加调试日志

文件：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

**位置：line 1581-1582**（在 `markdownToHtml` 调用之前）

添加：

```js
// 调试日志
console.log('[handleRefreshElectronPreview] resumeThemeClass.value:', resumeThemeClass.value);
console.log('[handleRefreshElectronPreview] extraStyles 前200字符:', extraStyles.value.substring(0, 200));
console.log('[handleRefreshElectronPreview] internalMarkdown 长度:', internalMarkdown.value.length);
const htmlContent = markdownToHtml(internalMarkdown.value, resumeThemeClass.value, extraStyles.value);
console.log('[handleRefreshElectronPreview] 生成的 HTML 总长度:', htmlContent.length);
```

### Step 2: 在 `markdownToHtml()` 函数入口添加调试日志

**位置：line 1794**（函数定义后第一行）

```js
function markdownToHtml(markdown: string, themeClass: string, extraStyles: string): string {
  console.log('[markdownToHtml] themeClass:', themeClass, '| extraStyles length:', extraStyles.length);
```

### Step 3: 删除 reset 块

**位置：line 1917-1925**

删除以下内容：

```js
/* 全局 reset：屏蔽 resumeMarkdownRaw 中的冲突属性 */
.resume-document {
  max-width: unset !important;
  min-height: unset !important;
  box-shadow: none !important;
  border-radius: unset !important;
  margin: 0 !important;
  padding: unset !important;
}
```

删除后，CSS 加载顺序变为：

1. `resumeMarkdownRaw` — 基础样式 + 主题变量定义
2. `getThemeCss(themeClass)` — 硬编码 hex 色值覆盖
3. `extraStyles` — 用户自定义样式

### Step 4: 验证修复

运行应用后：

1. 打开浏览器 DevTools Console
2. 切换主题（如切换到 dark）
3. 点击"刷新"生成精确预览
4. 查看 Console 中 `themeClass` 的值是否为对应主题（如 `theme-dark`）
5. 查看预览是否正确显示主题色

