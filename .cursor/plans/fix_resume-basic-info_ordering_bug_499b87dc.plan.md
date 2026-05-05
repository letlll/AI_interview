---
name: Fix resume-basic-info ordering bug
overview: Convert .resume-basic-info HTML block to pure markdown syntax instead of emitting raw HTML, eliminating both the ordering issue and the HTML tag clutter.
todos:
  - id: convert-basic-info-to-markdown
    content: Change handleDiv to output resume-basic-info as markdown instead of raw HTML
    status: pending
  - id: verify-handle-div
    content: Verify the new markdown output format
    status: pending
isProject: false
---

## Fix: Convert resume-basic-info HTML block to markdown syntax

### Root Cause

`handleDiv` outputs `resume-basic-info` as a raw HTML block (`<div>...</div>`). Raw HTML blocks in markdown are opaque to the parser — `marked` preserves them as-is, but `htmlToMarkdown` re-serializes them, and `postProcessSections` has no way to place them in the correct order, so they end up at the end of `.resume-document`.

### Fix: Convert to markdown syntax

**File:** `ai-interview-frontend/src/components/common/MarkdownRenderer.vue`

Replace the `handleDiv` case for `resume-basic-info` (line 338-341):

**Before:**

```338:    if (el.classList.contains('resume-basic-info') || el.id === 'resume-basic-info') {
339:      return el.innerHTML.replace(/ (contenteditable|data-listener-attached)="[^"]*"/g, '') + '\n';
340:    }
```

**After:**

```338:    if (el.classList.contains('resume-basic-info') || el.id === 'resume-basic-info') {
339:      // Convert to markdown format: **姓名**：目乐 | **年龄**：23 | 电话 | 邮箱
340:      const items = Array.from(el.querySelectorAll('.info-item'));
341:      const parts = items.map(item => {
342:        const label = item.querySelector('.label')?.textContent?.trim() || '';
343:        const valueEl = item.querySelector('.value') as HTMLElement | null;
344:        let value = valueEl?.textContent?.trim() || '';
345:        // 如果值是链接，保留为 markdown 链接格式
346:        if (valueEl?.tagName === 'A') {
347:          const href = (valueEl as HTMLAnchorElement).href || '';
348:          const mailtoHref = href.startsWith('mailto:') ? href.replace('mailto:', '') : href;
349:          return label ? `**${label}**：[${value}](${mailtoHref})` : `**${label}**：${value}`;
350:        }
351:        return label ? `**${label}**：${value}` : value;
352:      });
353:      return parts.join(' | ') + '\n';
354:    }
```

### Why this works

- **No raw HTML block** — `marked` treats the output as regular text/markdown, so it parses and renders it in the correct document order.
- **No `postProcessSections` reordering issue** — it's just a paragraph of text.
- **Clean markdown source** — the user sees `**姓名**：目乐 | **年龄**：23 | ...` instead of raw `<div>` tags.
- **HTML parsing works** — when editing in `contenteditable`, `htmlToMarkdown` re-extracts the same structure and produces the same clean markdown (since `<div>` elements are gone).

### Format

The output will be a single-line inline format:

```
**姓名**：目乐 | **年龄**：23 | **电话**：17265910650 | **邮箱**：[1427623704@qq.com](mailto:1427623704@qq.com)
```

### Verification

1. Markdown source should show clean markdown syntax (no raw HTML tags)
2. Rendered preview should show basic info at the correct position (before 教育背景)
3. Editing any field should preserve the clean markdown format

