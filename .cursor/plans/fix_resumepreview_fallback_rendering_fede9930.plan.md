---
name: Fix ResumePreview fallback rendering
overview: "`ResumePreview.vue` only reads `content_json` to render the resume. When `content_json` is empty (as with this resume), it shows \"该简历暂无内容\" — even though `resume_markdown` and `file_url` contain valid data. The fix adds a fallback chain: try `content_json` first → if empty, try `resume_markdown` via `PdfPageView` → if that's also empty, fall back to PDF iframe via `file_url`."
todos:
  - id: import-pdf-page-view
    content: Add PdfPageView import to ResumePreview.vue script
    status: completed
  - id: add-template-fallbacks
    content: Add resumeThemeClass ref and PdfPageView template branches with 3-tier fallback (content_json → resume_markdown → file_url)
    status: completed
  - id: verify-lints
    content: Verify no linter errors
    status: completed
isProject: false
---

## Bug: ResumePreview.vue shows "暂无内容" despite valid `resume_markdown` and `file_url`

**Root cause:** `ResumePreview.vue` line 110 only checks `content_json`. When it's empty `{}`, it silently renders nothing (the `allVisibleModules` computed returns empty arrays, triggering the "该简历暂无内容" empty state).

**Fix:** Add two fallback paths in `ResumePreview.vue`.

---

### Step 1: Add `v-else-if` branch for markdown fallback in template

Modify the `single-column` template branch in `[ResumePreview.vue](ai-interview-frontend/src/views/ResumePreview.vue)` (around line 16) to chain three conditions:

```vue
<template v-if="currentLayout === 'single-column'">
  <!-- 1. content_json 有数据 → 组件渲染（现有逻辑） -->
  <div v-if="allVisibleModules.length > 0" class="canvas-area">
    <div v-for="element in allVisibleModules" ...>...</div>
  </div>
  <!-- 2. content_json 为空，但 resume_markdown 有内容 → PdfPageView A4 分页渲染 -->
  <div v-else-if="resumeData?.resume_markdown" class="pdf-preview-fallback">
    <PdfPageView
      :content="resumeData.resume_markdown"
      :theme-class="resumeThemeClass"
      :visible="true"
    />
  </div>
  <!-- 3. content_json 和 resume_markdown 都为空 → 显示空状态 -->
  <div v-else class="empty-tip"><el-empty description="该简历暂无内容" /></div>
</template>
```

### Step 2: Add sidebar layout fallback

Similarly update the `sidebar` layout branch (around line 32) to fall back to `PdfPageView` when `finalLayout.sidebar` and `finalLayout.main` are both empty but `resume_markdown` exists.

### Step 3: Add script imports and computed for theme class

In the `<script setup>` section:

- Import `PdfPageView` from `@/components/common/PdfPageView.vue`
- Add `const resumeThemeClass = ref('theme-blue');` (use `resumeData.value?.template_name` to pick theme, defaulting to `'theme-blue'`)
- Add `resumeThemeClass` to the `PdfPageView` props

### Step 4: Optional — Add PDF iframe as final fallback

If the user also wants to see the saved PDF (from `file_url`), add a third fallback branch after the markdown check:

```vue
<div v-else-if="resumeData?.file_url" class="pdf-iframe-fallback">
  <iframe :src="resumeData.file_url" class="pdf-iframe" />
</div>
```

This covers the case where the resume only has a raw uploaded PDF with no structured data.

---

### Files to modify

- `ai-interview-frontend/src/views/ResumePreview.vue` — add fallback rendering chain

