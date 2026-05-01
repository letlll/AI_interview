---
name: Fix PDF preview Markdown rendering
overview: 修复 PdfPageView.vue 中 PDF 打印预览导出时 innerHTML 包含原始 Markdown 而非 HTML 的问题。核心原因：immediate:true 的 watch 在 contentRef 模板 ref 还未赋值时就执行了。
todos:
  - id: fix-watch-immediate
    content: 修复 1：PdfPageView.vue watch immediate:true 配合 contentRef 检查
    status: pending
  - id: fix-mounted-retry
    content: 修复 2：PdfPageView.vue onMounted 也加上 contentRef 检查的延迟重试
    status: pending
  - id: fix-fetch-wait
    content: 修复 3：fetchPreview 在调用前等待 PdfPageView 就绪
    status: pending
  - id: fix-get-html
    content: 修复 4：getExportInnerHtml 优先取 MarkdownRenderer 的 HTML（更可靠）
    status: pending
  - id: verify
    content: 验证：导出 PDF 时内容正确渲染
    status: pending
isProject: false
---

## 问题根因分析

### 关键发现

`PdfPageView.vue` 的 watch 已经添加了 `immediate: true`（你的修改已生效），但问题仍然存在。原因是：

**Vue 3 模板 ref 的赋值时机**：模板 ref（`contentRef`）是在组件 `onMounted` 之后才被 Vue 设置到 `ref` 对象上的。如果 `watch` 的 `immediate: true` 在 `onMounted` 之前或同时执行，`contentRef.value` 为 `null`，`renderContent()` 里的 `el.innerHTML = ...` 不会执行（被 `if (!el)` 拦截），**原始 Markdown 文本没有被替换**。

```
时间线（可能的问题路径）：
T1: watch(immediate:true) 触发 → contentRef.value === null → renderContent() 提前 return
T2: onMounted → contentRef.value 被 Vue 赋值 → renderContent() 执行 → innerHTML 变成 HTML
T3: recalculate() 执行 → 分页正常 → 屏幕显示 HTML ✓

但如果 T1 和 T2 之间发生了 PDF 导出：
T1.5: user 点击导出 → getExportInnerHtml() → printContentRoot.innerHTML 仍是原始 Markdown
T2: onMounted 才设置 innerHTML → 太晚了
```

### 为什么屏幕显示正常但导出异常？

因为屏幕显示的是 `renderVisiblePages()` 通过 `cloneNode` 克隆的 HTML（这部分是正确的），但 `contentRef.innerHTML` 本身从未被正确设置过原始 HTML 内容，导致导出时取到原始 Markdown。

---

## 修复计划（手动修改）

### 修复 1：watch immediate:true 配合 contentRef 检查（核心修复）

**文件**：`ai-interview-frontend/src/components/common/PdfPageView.vue`  
**位置**：第 471-474 行

**将：**

```javascript
watch(() => props.content, () => {
  renderContent();
  recalculate();
}, { immediate: true });
```

**改为：**

```javascript
watch(() => props.content, () => {
  // contentRef 可能在 immediate:true 时还未赋值，延迟到下一帧确保 ref 已设置
  nextTick(() => {
    if (contentRef.value) {
      renderContent();
      recalculate();
    } else {
      // 极端情况：contentRef 仍未就绪，等待 100ms 后重试
      setTimeout(() => {
        renderContent();
        recalculate();
      }, 100);
    }
  });
}, { immediate: true });
```

**效果**：确保 `renderContent()` 只在 `contentRef.value` 已就绪后才执行，避免 `el.innerHTML` 写入失败。

---

### 修复 2：onMounted 中的延迟重试也加上 contentRef 检查

**文件**：`ai-interview-frontend/src/components/common/PdfPageView.vue`  
**位置**：第 453-464 行

**将：**

```javascript
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
```

**改为：**

```javascript
  // 防御：如果 content 为空（简历数据尚未加载），等待 500ms 后重试
  if (!props.content?.trim()) {
    setTimeout(() => {
      if (props.content?.trim() && contentRef.value) {
        console.log('[PdfPageView] 延迟渲染：检测到内容已加载，重新渲染');
        renderContent();
        recalculate();
      }
    }, 500);
  }
```

**效果**：与修复 1 保持一致，确保 `contentRef` 就绪后才执行渲染。

---

### 修复 3：fetchPreview 在调用前等待 PdfPageView 就绪（防止竞态）

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 636-641 行（`openPdfPreview` 函数）

**将：**

```javascript
const openPdfPreview = () => {
  if (pdfPreviewLoading.value) return;
  pdfPreviewLoading.value = true;
  previewDialogVisible.value = true;
  nextTick().then(() => {
    fetchPreview();
  });
};
```

**改为：**

```javascript
const openPdfPreview = () => {
  if (pdfPreviewLoading.value) return;
  pdfPreviewLoading.value = true;
  previewDialogVisible.value = true;

  // 等待 PdfPageView 的 contentRef 就绪后再获取内容（最多等待 2 秒）
  const waitForContentReady = (retries = 20) => {
    const innerHtml = getExportInnerHtml();
    if (innerHtml?.trim()) {
      fetchPreview();
    } else if (retries > 0) {
      setTimeout(() => waitForContentReady(retries - 1), 100);
    } else {
      ElMessage.warning('未能获取到渲染内容，请稍后重试');
      pdfPreviewLoading.value = false;
    }
  };

  nextTick().then(() => {
    waitForContentReady();
  });
};
```

**效果**：即使 `PdfPageView` 的 `renderContent()` 还在执行中（`contentRef` 尚未赋值），`openPdfPreview` 也会等待最多 2 秒（20 × 100ms），直到 `getExportInnerHtml()` 能取到非空的 HTML 内容再调用 `fetchPreview()`。

---

### 修复 4：getExportInnerHtml 优先取 MarkdownRenderer 的 HTML（更可靠的来源）

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 513-519 行

**将：**

```javascript
  if (rightPanelMode.value === 'markdown') {
    if (markdownRoot?.innerHTML?.trim()) return markdownRoot.innerHTML;
    if (printContentRoot?.innerHTML?.trim()) return printContentRoot.innerHTML;
  } else {
    if (printContentRoot?.innerHTML?.trim()) return printContentRoot.innerHTML;
    if (markdownRoot?.innerHTML?.trim()) return markdownRoot.innerHTML;
  }
```

**改为：**

```javascript
  // 优先取 MarkdownRenderer 的 HTML（它始终在屏幕上渲染，内容最可靠）
  // 当 mode === 'markdown' 时必须用 MarkdownRenderer（printContentRoot 不在 DOM 中）
  // 当 mode === 'print' 时也优先取 MarkdownRenderer（如果可用），否则取 PdfPageView 的 contentRef
  if (markdownRoot?.innerHTML?.trim()) {
    return markdownRoot.innerHTML;
  }
  // fallback 到 PdfPageView 的 contentRef（注意：这是内部隐藏源，内容是 marked 解析后的 HTML）
  if (printContentRoot?.innerHTML?.trim()) {
    return printContentRoot.innerHTML;
  }
```

**效果**：无论当前是什么预览模式，`getExportInnerHtml()` 都优先取 `MarkdownRenderer` 的 HTML（这个始终在屏幕上正常渲染）。`PdfPageView` 的 `contentRef` 只作为 fallback。这解决了 `PdfPageView` 的 `contentRef.innerHTML` 在某些时机下仍为原始 Markdown 的问题。

---

## 修改文件汇总


| 序号  | 文件                                   | 关键修改                                            |
| --- | ------------------------------------ | ----------------------------------------------- |
| 1   | `PdfPageView.vue` 第 471-474 行        | watch immediate:true + nextTick + contentRef 检查 |
| 2   | `PdfPageView.vue` 第 453-464 行        | 延迟重试添加 contentRef 检查                            |
| 3   | `ResumeGeneratorNew.vue` 第 636-641 行 | openPdfPreview 增加等待 contentReady 逻辑             |
| 4   | `ResumeGeneratorNew.vue` 第 513-519 行 | getExportInnerHtml 优先取 MarkdownRenderer         |


## 验证步骤

1. 保存所有修改
2. 切换到**打印预览（Print Preview）**模式
3. 确认屏幕上的预览内容正确渲染为 HTML（标题大字居中）
4. 点击**导出 PDF**（或"打开 PDF 预览"）
5. 确认弹出的预览中，简历内容正确显示为 HTML 而非原始 Markdown 语法
6. 打开浏览器控制台，过滤 `getExportInnerHtml`，确认 `markdownRootHtmlLen > 0`

