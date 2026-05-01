---
name: Fix PDF export HTML/Markdown mix
overview: 针对日志暴露的 bodyTextLength 过小（仅 2061 字符）问题，增加诊断日志追踪 HTML 源头，并修复 destroy-on-close 生命周期问题。
todos: []
isProject: false
---

## 问题根因分析

### 终端日志解码（关键线索）

```
[DEBUG] printToPDF 前 DOM: {
  "bodyScrollHeight": 1123,    ← 恰好 = 1 个 A4 页高（1123px），内容可能被裁剪
  "bodyScrollWidth": 879,
  "bodyTextLength": 2061,      ← ⚠️ 只有 2061 字符（如果传入了 HTML，内容应更大）
  "hasResumeDoc": true,
  "hasMarkdownBody": false
}
```

`bodyTextLength: 2061` 说明传入 Electron 的 HTML 可能只是原始 Markdown（`# 姓名\n## 联系方式\n...` 大约 2000 字符）。如果内容是正确的 HTML，应该是数万字符。**问题确认：前端传入了 Markdown 而非 HTML。**

### 数据流分析

```
PDF 导出流程：
1. openPdfPreview()
   └─ nextTick → waitForContentReady() → getExportInnerHtml()
2. getExportInnerHtml()
   ├─ markdownRoot.innerHTML → if (truthy) return
   └─ printContentRoot.innerHTML → fallback
3. fetchPreview()
   └─ getExportInnerHtml() → buildPdfHtmlDocument() → POST /api/preview
4. Electron 端
   └─ generatePdfPreview(html)
      └─ printToPDF → bodyTextLength: 2061 ← raw Markdown 字符数
```

**两种可能的污染路径**：

- `markdownRoot.innerHTML` 在某些时机下仍为原始 Markdown（MarkdownRenderer 未完全渲染）
- `printContentRoot.innerHTML` 返回了原始 Markdown（PdfPageView.renderContent() 未执行）

---

## 修复计划

### 修复 1：移除 dialog 的 `destroy-on-close`（防止组件生命周期问题）

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 94 行

```vue
<!-- 将：-->
<el-dialog
  v-model="pdfPreviewVisible"
  title="PDF 预览"
  width="680px"
  :close-on-click-modal="false"
  destroy-on-close          ← 删除此行
>
```

**原因**：`destroy-on-close` 在 dialog 关闭时销毁内部组件（el-empty 等），导致重新打开时组件需要重新 mount，可能出现竞态。

---

### 修复 2：在 `getExportInnerHtml` 增加详细诊断日志

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 503-534 行

在函数开头和每个分支增加 `console.log`，记录：

- `rightPanelMode` 当前预览模式
- `hasMarkdownRoot` / `markdownRootHtmlLen` / 前 50 字符（判断是 HTML `<div` 还是 Markdown `#`）
- `hasPrintContentRoot` / `printContentRootHtmlLen` / 前 50 字符
- 最终返回内容的前 100 字符

```javascript
const getExportInnerHtml = (): string => {
  const unwrapMaybeRef = <T>(v: T | { value: T } | null | undefined): T | undefined => {
    if (v && typeof v === 'object' && 'value' in v) return (v as { value: T }).value;
    return v as T | undefined;
  };

  const markdownRoot = unwrapMaybeRef<HTMLElement | null>(markdownRendererRef.value?.markdownRoot) ?? undefined;
  const printContentRoot = unwrapMaybeRef<HTMLElement | null>(pdfPageViewRef.value?.contentRef) ?? undefined;

  const mdHtml = markdownRoot?.innerHTML?.trim() || '';
  const printHtml = printContentRoot?.innerHTML?.trim() || '';
  console.log('[getExportInnerHtml]', {
    rightPanelMode: rightPanelMode.value,
    hasMarkdownRoot: !!markdownRoot,
    markdownRootHtmlLen: mdHtml.length,
    markdownRootFirst50: mdHtml.substring(0, 50),     // HTML? → <div  Markdown? → #
    hasPrintContentRoot: !!printContentRoot,
    printContentRootHtmlLen: printHtml.length,
    printContentRootFirst50: printHtml.substring(0, 50),
  });

  if (mdHtml) {
    console.log('[getExportInnerHtml] → 使用 markdownRoot，长度:', mdHtml.length);
    return mdHtml;
  }
  if (printHtml) {
    console.log('[getExportInnerHtml] → 使用 printContentRoot，长度:', printHtml.length);
    return printHtml;
  }

  console.warn('[getExportInnerHtml] 无可用渲染内容', {
    rightPanelMode: rightPanelMode.value,
    hasMarkdownRoot: !!markdownRoot,
    markdownRootHtmlLen: mdHtml.length,
    hasPrintContentRoot: !!printContentRoot,
    printContentRootHtmlLen: printHtml.length,
  });
  return '';
};
```

---

### 修复 3：在 `fetchPreview` 增加输入输出日志

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 663 行

```javascript
const fetchPreview = async () => {
  const innerHtml = getExportInnerHtml();
  console.log('[fetchPreview]', {
    inputLen: innerHtml?.length,
    inputFirst100: innerHtml?.substring(0, 100),  // 判断是 HTML (<div) 还是 Markdown (#)
  });
  if (!innerHtml?.trim()) { ... }
  // ...
  const html = buildPdfHtmlDocument(innerHtml, resumeThemeClass.value);
  console.log('[fetchPreview] 生成的 HTML 文档长度:', html?.length,
    '前 200 字符:', html?.substring(0, 200));
```

---

### 修复 4：移除 `waitForContentReady` 中 `fetchPreview` 调用前的空日志

（可选）当前 `waitForContentReady` 调用 `getExportInnerHtml()` 时没有记录，可以加一行日志帮助调试：

```javascript
const waitForContentReady = (retries = 20) => {
  const innerHtml = getExportInnerHtml();
  if (innerHtml?.trim()) {
    console.log(`[waitForContentReady] 内容就绪，长度 ${innerHtml.length}，调用 fetchPreview`);
    fetchPreview();
  } else if (retries > 0) {
    console.log(`[waitForContentReady] 第 ${21 - retries}/20 次，内容仍为空，等待 100ms 后重试`);
    setTimeout(() => waitForContentReady(retries - 1), 100);
  } else { ... }
};
```

---

## 修改文件汇总


| 序号  | 文件                                   | 关键修改                         |
| --- | ------------------------------------ | ---------------------------- |
| 1   | `ResumeGeneratorNew.vue` 第 94 行      | 移除 `destroy-on-close`        |
| 2   | `ResumeGeneratorNew.vue` 第 503-534 行 | `getExportInnerHtml` 加详细诊断日志 |
| 3   | `ResumeGeneratorNew.vue` 第 663-674 行 | `fetchPreview` 加输入输出日志       |
| 4   | `ResumeGeneratorNew.vue` 第 641-651 行 | `waitForContentReady` 加重试日志  |


## 验证步骤

1. 保存所有修改，打开浏览器控制台过滤 `getExportInnerHtml`
2. 切换到 **Markdown 预览**模式
3. 点击**导出 PDF**，观察控制台：
  - `markdownRootFirst50` 应以 `<` 开头（HTML div 结构）——正常
  - `markdownRootFirst50` 以 `#` 开头——MarkdownRenderer 还未渲染完
4. 如果 `markdownRootFirst50` 以 `#` 开头：
  - 说明 MarkdownRenderer 渲染太慢，`waitForContentReady` 在重试
  - 等待 2 秒后观察 `content 就绪` 日志出现
  - 如果重试到超时（20 次）仍未就绪，问题在 MarkdownRenderer 的 watch/onMounted

