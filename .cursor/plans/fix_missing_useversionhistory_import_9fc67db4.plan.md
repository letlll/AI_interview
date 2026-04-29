---
name: Fix missing useVersionHistory import
overview: Fix the missing import for `useVersionHistory` in ResumeGeneratorNew.vue. Add `import { useVersionHistory } from '@/composables/useVersionHistory'` to the script setup block.
todos: []
isProject: false
---

Fix missing `useVersionHistory` import in `ResumeGeneratorNew.vue`.

**File:** [ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue)

**Root cause:** Line 343 calls `useVersionHistory()` but the corresponding `import` statement is missing from the `<script setup lang="ts">` block.

**Fix:** Add one import line after the existing composable imports:

```typescript
// In the script setup block, after line 330 (import useResumeAI):
import { useVersionHistory } from '@/composables/useVersionHistory';
```

This is the only change needed — the composable file already exists at `src/composables/useVersionHistory.ts` and exports `useVersionHistory` correctly.