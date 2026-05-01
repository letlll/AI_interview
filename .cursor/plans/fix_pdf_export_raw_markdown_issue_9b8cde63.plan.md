---
name: Fix PDF export raw Markdown issue
overview: 在 export 调用前后增加详细日志追踪 raw Markdown 的来源，同时移除 destroy-on-close 防止 dialog 生命周期问题。
todos: []
isProject: false
---

## 问题根因分析

### 关键发现：MarkdownRenderer.renderAll() 是 async 函数但 watch 没有 await

```18:20:ai-interview-frontend/src/components/common/MarkdownRenderer.vue
onMounted(renderAll);
watch(() => props.content, renderAll);
```

`renderAll` 是 `async` 函数（内有 `await mermaid.render()`），但 `watch` 和 `onMounted` 没有 `await`，所以 Vue 不会等待 `markdownRoot.innerHTML` 被赋值，rendering 可能在后台进行。

**但更重要的是**：`destroy-on-close` 导致 dialog 关闭时内部组件被销毁，重新打开时 `markdownRendererRef`/`pdfPageViewRef` 可能未就绪。

### getExportInnerHtml 的问题

当前函数没有日志，不知道哪个路径被命中、返回了什么。需要加日志来追踪。

### 完整修复计划

#### 修复 1：移除 dialog 的 `destroy-on-close`

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 94 行

```javascript
// 将：
:close-on-click-modal="false"
destroy-on-close

// 改为：
:close-on-click-modal="false"
```

**原因**：`destroy-on-close` 在 dialog 关闭时销毁内部组件，导致 `markdownRendererRef` / `pdfPageViewRef` 可能变成 `null`。移除后组件状态保持，不会出现"组件还没 mount 完成就调用 getExportInnerHtml"的问题。

---

#### 修复 2：在 getExportInnerHtml 增加详细诊断日志

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 503-534 行

在函数开头和每个分支增加 `console.log`，记录：

- `rightPanelMode`
- `hasMarkdownRoot` / `markdownRootHtmlLen`
- `hasPrintContentRoot` / `printContentRootHtmlLen`
- 最终返回的 content 前 100 字符

这样导出时就能在控制台看到具体哪个路径被命中、返回内容是什么。

---

#### 修复 3：在 fetchPreview 增加输入输出日志

**文件**：`ai-interview-frontend/src/views/ResumeGeneratorNew.vue`  
**位置**：第 663 行 `fetchPreview` 函数开头

```javascript
const fetchPreview = async () => {
  const innerHtml = getExportInnerHtml();
  console.log('[fetchPreview] 输入 HTML 长度:', innerHtml?.length, 
    '前 200 字符:', innerHtml?.substring(0, 200));
  if (!innerHtml?.trim()) { ... }
  // ...
  console.log('[fetchPreview] 生成的 PDF HTML 文档长度:', html?.length,
    '前 200 字符:', html?.substring(0, 200));
```

---

#### 修复 4：确保 MarkdownRenderer 的 renderAll 被正确等待（可选）

**文件**：`ai-interview-frontend/src/components/common/MarkdownRenderer.vue`  
**位置**：第 633-634 行

```javascript
// 将：
onMounted(renderAll);
watch(() => props.content, renderAll);

// 改为：
onMounted(() => { renderAll(); });
watch(() => props.content, () => { renderAll(); });
```

显式 `() => { renderAll(); }` 让 `renderAll()` 的 Promise 在 microtask 队列中执行，不阻塞 watch 回调本身，但确保 `markdownRoot.innerHTML` 在下一个 tick 被设置。

---

## 修改文件汇总


| 序号  | 文件                                   | 修改内容                        |
| --- | ------------------------------------ | --------------------------- |
| 1   | `ResumeGeneratorNew.vue` 第 94 行      | 移除 `destroy-on-close`       |
| 2   | `ResumeGeneratorNew.vue` 第 503-534 行 | getExportInnerHtml 加详细日志    |
| 3   | `ResumeGeneratorNew.vue` 第 663-674 行 | fetchPreview 加输入输出日志        |
| 4   | `MarkdownRenderer.vue` 第 633-634 行   | watch / onMounted 用显式箭头函数包裹 |


## 验证步骤

1. 保存所有修改
2. 打开浏览器控制台，过滤 `getExportInnerHtml` / `fetchPreview`
3. 切换到 **Markdown 预览**模式
4. 点击**导出 PDF**
5. 在控制台中观察：
  - `getExportInnerHtml` 日志显示 `markdownRootHtmlLen > 0` 且 content 以 `<` 开头（HTML）→ 正常
  - `fetchPreview` 显示输入 HTML 前 200 字符为 HTML 结构 → 正常
6. 如果 content 仍以 `#` 或 `*` 开头（Markdown），说明是 MarkdownRenderer 还未渲染完，waitForContentReady 会自动重试直到超时或 content 出现

