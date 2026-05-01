---
name: Fix theme-blue hardcoding in markdownToHtml
overview: Fix the hardcoded 'theme-blue' in markdownToHtml() so that the correct theme CSS is injected when the user switches themes.
todos: []
isProject: false
---

## Problem

In `markdownToHtml()` at [ResumeGeneratorNew.vue line 1932](ai-interview-frontend/src/views/ResumeGeneratorNew.vue#L1932), `getThemeCss('theme-blue')` is hardcoded — it always injects the blue theme CSS regardless of the actual `themeClass` parameter passed to the function. This makes `themeClass` changes (e.g., switching to `theme-dark`) completely ineffective in the Electron PDF/exact preview.

## Fix

Change the hardcoded `'theme-blue'` argument to use the actual `themeClass` parameter.

**Before (line 1932):**

```js
${getThemeCss('theme-blue')}
```

**After:**

```js
${getThemeCss(themeClass)}
```

This is a single-line fix. The `getThemeCss()` function already has correct implementations for all themes (`theme-blue`, `theme-dark`, `theme-minimal`, `theme-classic`, `theme-modern`), and the `themeClass` parameter is already passed into `markdownToHtml()`. The only bug is that the wrong value was being passed in.