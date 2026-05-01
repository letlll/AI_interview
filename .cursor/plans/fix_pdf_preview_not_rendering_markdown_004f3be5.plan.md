---
name: Fix PDF preview not rendering Markdown
overview: 修复 PdfPageView.vue 中 Markdown 内容未正确渲染为 HTML 的问题，原因是 onMounted 时 content 为空导致 renderContent() 提前退出，watch 未能立即触发。
todos:
  - id: fix-pv-watch
    content: "修复 1：PdfPageView.vue watch 添加 immediate: true"
    status: pending
  - id: fix-pv-mounted
    content: 修复 2：PdfPageView.vue onMounted 添加延迟重试防御
    status: pending
  - id: fix-fetch-empty
    content: 修复 3：ResumeGeneratorNew.vue fetchPreview 空内容保护
    status: pending
  - id: fix-debug-log
    content: 修复 4：ResumeGeneratorNew.vue getExportInnerHtml 调试日志
    status: pending
isProject: false
---

## 问题分析

### 错误现象

PDF 打印预览（Print Preview）显示的是**原始 Markdown 文本**（如 `# 张三`、`## 教育背景`），而不是渲染后的 HTML（`<h1>张三</h1>`）。

### 根本原因

数据流链路是：`ResumeGeneratorNew.vue` → `internalMarkdown`（ref）→ `PdfPageView` 的 `props.content` → `renderContent()`

问题出在 **两个时机**：

#### 问题 1：onMounted 时机太早

```
1. PdfPageView onMounted
   → renderContent() 执行
   → props.content 此时为 ''（简历数据尚未加载）
   → renderContent() 提前 return（第 309-315 行）
   → innerHTML 未被设置 → 预览空白
   
2. loadResumeList() + handleResumeChange() 完成（异步）
   → internalMarkdown.value 更新
   → watch(props.content) 触发 → renderContent() 执行
```

理论上第 2 步应该修复问题，但实际没有，原因是：

#### 问题 2：PdfPageView 可能在简历数据加载完成前就被卸载/重建

如果 `ResumeGeneratorNew` 在 `PdfPageView` 渲染期间发生了组件重建（例如切换路由、切换 `rightPanelMode`），新的 `PdfPageView` 实例会在 `props.content` 仍为空时再次触发 `onMounted`，再次 `renderContent()` 提前退出。

#### 问题 3：PdfPageView 的 watch 没有 `immediate: true`

查看 `PdfPageView.vue` 第 460 行：

```javascript
watch(() => props.content, () => {
  renderContent();
  recalculate();
});
```

**关键缺陷**：没有 `immediate: true`，意味着组件挂载时 watch 不会立即执行。如果 `props.content` 在 `onMounted` 之后才变为非空（简历数据加载），watch 会正确触发。但如果内容在 `onMounted` **之前或同时**变为非空，watch 的行为不可靠。

#### 问题 4：fetchPreview 的 fallback 可能取到空内容

在 `getExportInnerHtml()` 中，如果 `markdownRoot` 和 `printContentRoot` 都为空，`innerHtml` 为空字符串，`buildPdfHtmlDocument` 会生成一个只有 `<div class="resume-document"></div>` 的空 HTML。

---

## 修复计划（手动修改）

### 修复 1：给 PdfPageView 的 watch 添加 `immediate: true`（核心修复）

**文件**：`ai-interview-frontend/src/components/common/PdfPageView.vue`  
**位置**：第 460-463 行

**将：**

```javascript
watch(() => props.content, () => {
  renderContent();
  recalculate();
});
```

**改为：**

```javascript
watch(() => props.content, () => {
  renderContent();
  recalculate();
}, { immediate: true });
```

**效果**：`immediate: true` 确保组件挂载时 watch 立即执行一次，即使 `onMounted` 已经触发过。这样无论 `props.content` 何时变为非空，都能确保 `renderContent()` 被调用。

---

### 修复 2：在 onMounted 中添加内容检查，没有内容时延迟重试

**文件**：`ai-interview-frontend/src/components/common/PdfPageView.vue`  
**位置**：第 444-453 行（onMounted 函数）

**当前代码：**

```javascript
onMounted(() => {
  console.log('[PdfPageView onMounted]', {
    contentLen: props.content?.length ?? 0,
    visible: props.visible,
    themeClass: props.themeClass,
  });
  renderContent();
  recalculate();
  setupResizeObserver();
});
```

**改为：**

```javascript
onMounted(() => {
  console.log('[PdfPageView onMounted]', {
    contentLen: props.content?.length ?? 0,
    visible: props.visible,
    themeClass: props.themeClass,
  });
  renderContent();
  recalculate();
  setupResizeObserver();

  // 防御：如果 content 为空（简历数据尚未加载），等待 500ms 后重试
  if (!props.content?.trim()) {
    setTimeout(() => {
      if (props.content?.trim()) {
        console.log('[PdfPageView] 延迟渲染：检测到内容已加载，重新渲染');
        renderContent();
        recalculate();
      }
    }, 500);
  }
});
```

**效果**：作为 `immediate: true` 的双保险，确保即使在极端时序下，内容也能被渲染。

---

### 修复 3：fetchPreview 添加空内容保护

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 643-648 行（fetchPreview 函数开头）

**当前代码：**

```javascript
const innerHtml = getExportInnerHtml();
if (!innerHtml) {
  ElMessage.warning('无法获取渲染内容，请先切换到 Markdown 或打印预览模式');
  pdfPreviewLoading.value = false;
  return;
}
```

**改为：**

```javascript
const innerHtml = getExportInnerHtml();
if (!innerHtml?.trim()) {
  ElMessage.warning('无法获取渲染内容，请先切换到 Markdown 或打印预览模式，等待内容加载完成后重试');
  pdfPreviewLoading.value = false;
  return;
}
```

**效果**：将空内容问题提前暴露，避免生成空白 PDF。

---

### 修复 4：在 getExportInnerHtml 中增加调试日志

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 521-526 行

**将：**

```javascript
  console.warn('[getExportInnerHtml] 无可用渲染内容', {
    rightPanelMode: rightPanelMode.value,
    hasMarkdownRoot: !!markdownRoot,
    hasPrintContentRoot: !!printContentRoot,
  });
```

**改为：**

```javascript
  const mdRootHtml = markdownRoot?.innerHTML?.trim() || '';
  const printRootHtml = printContentRoot?.innerHTML?.trim() || '';
  console.warn('[getExportInnerHtml] 无可用渲染内容', {
    rightPanelMode: rightPanelMode.value,
    hasMarkdownRoot: !!markdownRoot,
    markdownRootHtmlLen: mdRootHtml.length,
    hasPrintContentRoot: !!printContentRoot,
    printRootHtmlLen: printRootHtml.length,
  });
```

**效果**：当出现问题时，控制台会显示具体哪个 root 的 HTML 长度为 0，便于定位是 `MarkdownRenderer` 还是 `PdfPageView` 的问题。

---

## 修改文件汇总


| 序号  | 文件                       | 行号范围    | 修改内容                           |
| --- | ------------------------ | ------- | ------------------------------ |
| 1   | `PdfPageView.vue`        | 460-463 | watch 添加 `{ immediate: true }` |
| 2   | `PdfPageView.vue`        | 444-453 | onMounted 添加延迟重试防御             |
| 3   | `ResumeGeneratorNew.vue` | 643-648 | fetchPreview 空内容保护             |
| 4   | `ResumeGeneratorNew.vue` | 521-526 | getExportInnerHtml 增加调试日志      |


## 验证步骤

1. 保存修改后，打开简历页面
2. 切换到**打印预览（Print Preview）**模式
3. 确认内容显示为渲染后的 HTML（标题应为大字居中，而非 `# 标题`）
4. 点击**导出 PDF**，在预览弹窗中确认页面内容正确渲染
5. 打开浏览器控制台，过滤 `getExportInnerHtml`，确认两个 root 的 HTML 长度 > 0

