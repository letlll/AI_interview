---
name: Add AI continue-edit button to Resume list
overview: 在 Resume.vue 简历列表的"操作"列中添加一个"AI 继续编辑"按钮，点击后跳转到 ResumeGeneratorNew 并自动加载对应简历。
todos:
  - id: resume-add-icon
    content: Add Cpu icon import to Resume.vue
    status: completed
  - id: resume-add-button
    content: Add AI continue-edit button in table operations column
    status: completed
  - id: resume-add-handler
    content: Add handleContinueWithAI navigation function
    status: completed
isProject: false
---

## 改动点

仅修改 [ai-interview-frontend/src/views/Resume.vue](ai-interview-frontend/src/views/Resume.vue)

### 1. 导入 Cpu 图标

在已有的 `ArrowDown, UploadFilled` 导入行末尾加上 `Cpu`：

```typescript
import { ArrowDown, UploadFilled, Cpu } from '@element-plus/icons-vue';
```

### 2. 在操作列添加按钮

在 `el-table-column` (line 32-42) 的 `#default` 模板中，在"编辑"按钮后插入：

```html
<el-button
  @click="handleContinueWithAI(scope.row.id)"
  :icon="Cpu"
  type="warning"
  plain
>
  AI 继续编辑
</el-button>
```

### 3. 添加跳转函数

在 `<script setup>` 中添加：

```typescript
const handleContinueWithAI = (id: number) => {
  router.push({ name: 'ResumeGenerator', query: { resumeId: id } });
};
```

`ResumeGeneratorNew.vue` 的 `initConversation` 已支持 `route.query.resumeId`，会自动加载对应简历并进入编辑状态。