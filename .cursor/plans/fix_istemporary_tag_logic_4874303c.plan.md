---
name: Fix isTemporary tag logic
overview: 修复 ResumeGeneratorNew.vue 的"未保存"标签逻辑，让它在简历数据有未保存内容时显示，保存后消失。
todos: []
isProject: false
---

## 改动点

修改 [ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue)

### 1. 加载简历时自动标记为未保存

在 `handleResumeChange` 中，加载到有内容的简历时将 `isTemporary` 设为 `true`：

```typescript
// 加载简历内容
const cleanedContent = cleanInvalidKeys(selectedResume.content_json || {});
resumeData.value = { ...resumeData.value, ...cleanedContent };
if (cleanedContent.content !== undefined) {
  internalMarkdown.value = cleanedContent.content;
} else {
  internalMarkdown.value = cleanedContent.content || '';
}
// 恢复 extraStyles
if (cleanedContent.extraStyles !== undefined) {
  extraStyles.value = cleanedContent.extraStyles || '';
}

// 【新增】如果加载到了内容，标记为未保存状态
if (cleanedContent && Object.keys(cleanedContent).length > 0) {
  isTemporary.value = true;
  tempId.value = `temp_${resumeId}_${Date.now()}`;
}
```

### 2. 每次保存后清除未保存状态

在普通保存路径（`handleSave` 的 `if (currentResumeId.value)` 分支，line 1465 附近）末尾添加：

```typescript
if (target) {
  target.content_json = getResumeDataToSave();
}
isTemporary.value = false;   // 【新增】保存后清除未保存标记
tempId.value = null;         // 【新增】
ElMessage.success('已更新');
```

在新建草稿保存路径（line 1498 附近）末尾添加：

```typescript
currentResumeId.value = newResume.id;
// 【新增】
isTemporary.value = false;
tempId.value = null;
ElMessage.success('已保存为草稿');
```

同样在发布（`handlePublish`）、PDF 导出保存等路径末尾也需要清除，搜索所有 `ElMessage.success` 并在之前加 `isTemporary = false`。

### 3. 调整 UI（可选但推荐）

将标签向右移动，避免和保存按钮挤在一起，并增加文字说明保存状态来源：