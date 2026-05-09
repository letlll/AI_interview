---
name: Unify Resume Renderer — Low Coupling, High Cohesion
overview: Extract shared markdown→HTML pipeline into a single composable (marked config + preprocess + postProcess), deduplicate across MarkdownRenderer/PdfPageView/buildPdfHtmlDocument, and fix extraStyles to be inline in .resume-document.
todos:
  - id: create-shared-resume-renderer
    content: "Step 1: Create @/composables/useResumeRenderer.ts — shared pure render functions"
    status: pending
  - id: refactor-markdown-renderer
    content: "Step 2: Refactor MarkdownRenderer.vue — use composable, keep DOM side-effects only"
    status: pending
  - id: refactor-pdf-pageview
    content: "Step 3: Refactor PdfPageView.vue — use composable renderMarkdownContent() only"
    status: pending
  - id: refactor-generator-markdowntohtml
    content: "Step 4: Refactor ResumeGeneratorNew.markdownToHtml() — use composable"
    status: pending
  - id: fix-extrastyles-inline
    content: "Step 5: Fix extraStyles — inject as inline style inside .resume-document"
    status: pending
  - id: fix-buildpdfhtmldocument
    content: "Step 6: Fix buildPdfHtmlDocument — reuse resumeMarkdownRaw instead of duplicating CSS"
    status: pending
  - id: resume-preview-markdownrenderer
    content: "Step 7: ResumePreview.vue uses MarkdownRenderer directly"
    status: pending
  - id: generator-url-param
    content: "Step 8: ResumeGeneratorNew supports URL ?resumeId=63 auto-select"
    status: pending
  - id: right-panel-mode-publish
    content: "Step 9: Publish saves/restores rightPanelMode"
    status: pending
  - id: backend-resume-markdown
    content: "Step 10: Backend ResumeDetailSerializer adds resume_markdown field"
    status: pending
  - id: resume-editor-jump
    content: "Step 11: ResumeEditor adds AI continue-editing jump button"
    status: pending
isProject: false
---

## Root Cause: Triple Duplication + CSS Access Problem

Three places repeat identical marked configuration and rendering logic:

- `MarkdownRenderer.vue` lines 39-187: full marked config
- `PdfPageView.vue` lines 84-186: exact copy of above
- `ResumeGeneratorNew.vue` lines 1681-1737: exact copy in `markdownToHtml()`

Additionally, `buildPdfHtmlDocument()` generates a raw HTML string (not a Vue component), so `?raw` Vite imports and `.css` file references cannot work — it currently hardcodes ~60 lines of CSS that are inconsistent with `resume-markdown.css`.

## Low-Coupling Design

```
Step 1: Extract CSS to JS constant         Step 2: Extract marked to composable
  src/styles/resumeMarkdownCss.ts            src/composables/useResumeRenderer.ts
       │                                          │
       ▼                                          ▼
  MarkdownRenderer.vue ◄── import ──────── useResumeRenderer
  PdfPageView.vue ◄────────────── import useResumeRenderer
  buildPdfHtmlDocument() ◄──────── import useResumeRenderer (RESUME_CSS)

Responsibilities:
  resumeMarkdownCss.ts     <- CSS as JS string constant (single source of truth)
  useResumeRenderer.ts    <- markdown → HTML pipeline (pure functions, no DOM)
  MarkdownRenderer.vue     <- DOM side effects: Mermaid/KaTeX/contenteditable
  PdfPageView.vue         <- DOM side effects: pagination
  ResumeGeneratorNew.vue   <- calls the above, no duplication
```

---

## Step 0: Extract CSS to JS constant

**Why**: `buildPdfHtmlDocument()` generates a raw HTML string (not a Vue component), so `?raw` Vite imports and `.css` file references cannot work. The solution: extract CSS content into a JS string constant.

Create `ai-interview-frontend/src/styles/resumeMarkdownCss.ts`:

```typescript
// src/styles/resumeMarkdownCss.ts
// Full content of src/assets/styles/resume-markdown.css as a JS string constant.
// This file is the SINGLE SOURCE OF TRUTH for resume CSS.
// When resume-markdown.css changes: copy its new content into this file.
// This is the only manual sync needed — all three rendering paths automatically get the update.

export const RESUME_CSS = String.raw`/* ... copy full resume-markdown.css here ... */`;

export default RESUME_CSS;
```

> **Update workflow**: When you edit `resume-markdown.css`, copy the new content into `resumeMarkdownCss.ts`. No other files need updating.

---

## Step 1: Create `useResumeRenderer.ts`

File: `ai-interview-frontend/src/composables/useResumeRenderer.ts`

Same as previously planned. Also re-export `RESUME_CSS` so all paths can access it through one import:

```typescript
import { RESUME_CSS } from '@/styles/resumeMarkdownCss';
export { RESUME_CSS };
```

```typescript
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';

// section type -> list/item class mapping (matches resume-markdown.css)
const LIST_CLASS_MAP: Record<string, string> = {
  skills: 'skills-list', skill: 'skills-list',
  summary: 'summary-list',
  work: 'work-list',
  projects: 'project-list', project: 'project-list',
  education: 'education-list',
};

const ITEM_CLASS_MAP: Record<string, string> = {
  skills: 'skill-item', skill: 'skill-item',
  summary: 'summary-item',
  work: 'work-item',
  projects: 'project-item', project: 'project-item',
  education: 'education-item',
};

export const INLINE_STYLES_ID = 'inline-extra-styles';

export function autoDetectSectionType(text: string): string {
  const lower = text.toLowerCase();
  if (/^(工作|实习|experience|work)/.test(lower)) return 'work';
  if (/^(项目|demo|project)/.test(lower)) return 'projects';
  if (/^(教育|education|学校)/.test(lower)) return 'education';
  if (/^(技能|skill|技术)/.test(lower)) return 'skills';
  if (/^(个人|summary|简介|about)/.test(lower)) return 'summary';
  return 'custom';
}

// ============================================================
// Preprocess: strip meta comments, track section type
// ============================================================
const SECTION_META_RE = /^<!--\s*(?:section:|type:)([\w-]+)(?::([\s\S]*?))?\s*-->\s*$/;

export function preprocessMarkdown(content: string): { markdown: string; sectionType: string } {
  let sectionType = '';
  const lines = content.split('\n');
  const output: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(SECTION_META_RE);
    if (match) { sectionType = match[1]; continue; }
    output.push(line);
  }
  return { markdown: output.join('\n'), sectionType };
}

// ============================================================
// Shared Marked instance (singleton)
// ============================================================
let _markedInstance: Marked | null = null;

export function createMarkedInstance(): Marked {
  if (_markedInstance) return _markedInstance;

  const md = new Marked();
  md.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    }
  }));

  md.use({
    renderer: {
      heading(this: any, token: any): string {
        const depth = token.depth;
        const inner = this.parser.parseInline(token.tokens);
        if (depth === 1) {
          const plainTitle = this.parser.parseInline(token.tokens).replace(/"/g, '&quot;');
          return `<h1 class="resume-name" contenteditable="true" data-original-title="${plainTitle}">${inner}</h1>\n`;
        }
        const slug = autoDetectSectionType(inner.replace(/<[^>]+>/g, '').trim());
        const titleClass = slug ? `section-title--${slug}` : '';
        const classes = ['section-title', titleClass, `h${depth}`].filter(Boolean).join(' ');
        return `<h${depth} class="${classes}" contenteditable="true" data-section-type="${slug}">${inner}</h${depth}>\n`;
      },
      list(this: any, token: any): string {
        const sectionType = (token._sectionType as string) || 'custom';
        const listClass = LIST_CLASS_MAP[sectionType] || 'item-list';
        let body = '';
        for (const item of token.items) body += this.listitem(item);
        const tag = token.ordered ? 'ol' : 'ul';
        const start = token.ordered && token.start !== 1 && token.start !== '' ? ` start="${token.start}"` : '';
        return `<${tag} class="${listClass}"${start}>\n${body}</${tag}>\n`;
      },
      listitem(this: any, token: any): string {
        let prefix = '';
        if (token.task) {
          const cb = this.checkbox({ checked: !!token.checked });
          if (token.loose) {
            const first = token.tokens[0];
            if (first?.type === 'paragraph' && first.tokens?.[0]) {
              first.text = `${cb} ${first.text || ''}`;
              const t0 = first.tokens[0];
              if (t0?.type === 'text') t0.text = `${cb} ${t0.text || ''}`;
            } else {
              token.tokens.unshift({ type: 'text', raw: `${cb} `, text: `${cb} `, escaped: true });
            }
          } else { prefix = `${cb} `; }
        }
        const inner = this.parser.parse(token.tokens, !!token.loose);
        const sectionType = (token._sectionType as string) || 'custom';
        const itemClass = ITEM_CLASS_MAP[sectionType] || 'item';
        return `<li class="${itemClass}">${prefix}${inner}</li>\n`;
      },
      table(this: any, token: any): string {
        let header = '';
        for (const cell of token.header) header += this.tablecell(cell);
        let rows = '';
        for (const row of token.rows) {
          let cells = '';
          for (const cell of row) cells += this.tablecell(cell);
          rows += `<tr>${cells}</tr>\n`;
        }
        return `<div class="table-wrapper"><table class="table"><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
      tablecell(this: any, cell: any): string {
        const content = this.parser.parseInline(cell.tokens);
        const tag = cell.header ? 'th' : 'td';
        const alignClass = cell.align ? ` text-${cell.align}` : '';
        return `<${tag} class="table-cell${alignClass}">${content}</${tag}>\n`;
      },
      paragraph(this: any, token: any): string {
        return `<p class="paragraph">${this.parser.parseInline(token.tokens)}</p>\n`;
      },
      link(this: any, token: any): string {
        const inner = this.parser.parseInline(token.tokens);
        const titleAttr = token.title ? ` title="${token.title}"` : '';
        return `<a class="link" href="${token.href}"${titleAttr}>${inner}</a>`;
      },
      blockquote(this: any, token: any): string {
        const body = this.parser.parse(token.tokens);
        return `<blockquote class="blockquote">${body}</blockquote>\n`;
      },
      hr(): string { return `<hr class="divider" />\n`; },
      image(this: any, token: any): string {
        const titleAttr = token.title ? ` title="${token.title}"` : '';
        return `<figure class="image-figure"><img class="image" src="${token.href}" alt="${token.text}"${titleAttr} />${token.title ? `<figcaption class="image-caption">${token.title}</figcaption>` : ''}</figure>\n`;
      },
    },
    async: false,
  });

  _markedInstance = md;
  return md;
}

// ============================================================
// Core render: markdown -> HTML string
// extraStyles is inline inside .resume-document so innerHTML includes it
// ============================================================
export interface RenderOptions {
  content: string;
  themeClass?: string;
  extraStyles?: string;
  forPdf?: boolean;
}

export function renderMarkdownContent(options: RenderOptions): string {
  const { content, themeClass = 'theme-blue', extraStyles = '' } = options;
  const marked = createMarkedInstance();
  const { markdown: cleanedMd } = preprocessMarkdown(content);
  const innerHtml = marked.parse(cleanedMd) as string;

  const extraStylesBlock = extraStyles.trim()
    ? `<style id="${INLINE_STYLES_ID}">\n${extraStyles}\n</style>`
    : '';

  return `<div class="resume-document ${themeClass}">\n` +
    extraStylesBlock +
    innerHtml +
    `\n</div>`;
}

// ============================================================
// Post-process DOM: group content by heading levels into sections
// Called after innerHTML is set
// ============================================================
export function postProcessSectionsDOM(root: HTMLElement): void {
  const doc = root.querySelector('.resume-document');
  if (!doc) return;

  const children = Array.from(doc.children);
  const stack: HTMLElement[] = [];

  children.forEach(child => {
    const el = child as HTMLElement;
    const headingMatch = el.tagName.match(/^H([1-6])$/);
    if (!headingMatch) {
      if (stack.length > 0) stack[stack.length - 1].appendChild(el);
      else doc.appendChild(el);
      return;
    }

    const level = parseInt(headingMatch[1]);

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const topLevel = parseInt(top.dataset.headingLevel || '0');
      if (topLevel >= level) {
        const parent = top.parentElement;
        if (parent && parent !== doc) {
          while (top.firstChild) parent.insertBefore(top.firstChild, top);
          parent.removeChild(top);
        }
        stack.pop();
      } else break;
    }

    const sectionType = el.dataset.sectionType || 'custom';
    const sectionClass = level === 2
      ? `section section--${sectionType}`
      : 'subsection';
    const titleClass = level === 2
      ? `section-title section-title--${sectionType}`
      : 'subsection-title';

    const section = document.createElement(level === 2 ? 'section' : 'div');
    section.className = sectionClass;
    section.dataset.headingLevel = String(level);
    el.classList.add(titleClass);
    section.appendChild(el);

    if (stack.length === 0) doc.appendChild(section);
    else stack[stack.length - 1].appendChild(section);

    stack.push(section);
  });

  while (stack.length > 1) {
    const top = stack.pop()!;
    const parent = stack[stack.length - 1];
    while (top.firstChild) parent.appendChild(top.firstChild);
  }
}
```

---

## Step 2: Refactor `MarkdownRenderer.vue`

File: `ai-interview-frontend/src/components/common/MarkdownRenderer.vue`

- Remove lines 7-9: import Marked, markedHighlight, hljs
- Remove lines 39-187: full marked instance configuration
- Remove lines 192-203: preprocessMarkdown function
- Remove lines 205-263: postProcessSections function

Add at top:

```typescript
import { renderMarkdownContent, postProcessSectionsDOM } from '@/composables/useResumeRenderer';
import mermaid from 'mermaid';
import katex from 'katex';
```

Simplify `renderAll`:

```typescript
const renderAll = async () => {
  if (!markdownRoot.value || !props.content) return;

  markdownRoot.value.innerHTML = renderMarkdownContent({
    content: props.content,
    themeClass: props.themeClass || 'theme-blue',
    extraStyles: props.extraStyles || '',
    forPdf: false,
  });

  postProcessSectionsDOM(markdownRoot.value);

  await nextTick();
  // Mermaid / KaTeX rendering — keep existing logic unchanged
  // contenteditable — keep existing logic unchanged
  attachEditableListeners();
};

onMounted(() => { renderAll(); });
watch(() => props.content, () => { renderAll(); });
watch(() => [props.themeClass, props.extraStyles], () => { renderAll(); });

// Remove injectExtraStyles() — no longer needed
```

---

## Step 3: Refactor `PdfPageView.vue`

File: `ai-interview-frontend/src/components/common/PdfPageView.vue`

- Remove lines 51-53: import Marked, markedHighlight, hljs
- Remove lines 84-186: full marked instance configuration
- Remove lines 192-263: preprocessMarkdown + postProcessSections
- Remove lines 328-330: old extraStyles injection

Add:

```typescript
import { renderMarkdownContent, postProcessSectionsDOM } from '@/composables/useResumeRenderer';
```

Simplify `renderContent`:

```typescript
const renderContent = () => {
  if (!contentRef.value || !props.content) return;

  contentRef.value.innerHTML = renderMarkdownContent({
    content: props.content,
    themeClass: props.themeClass || 'theme-blue',
    extraStyles: props.extraStyles || '',
    forPdf: true,
  });

  postProcessSectionsDOM(contentRef.value);
  recalculate();
};
```

---

## Step 4: Refactor `ResumeGeneratorNew.markdownToHtml()`

File: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

Around line 1678, replace the entire `markdownToHtml()` function body:

```typescript
import { renderMarkdownContent } from '@/composables/useResumeRenderer';

function markdownToHtml(markdown: string, themeClass: string, extraStyles: string): string {
  // extraStyles is already inline inside .resume-document
  return renderMarkdownContent({ content: markdown, themeClass, extraStyles, forPdf: false });
}

// Delete all original lines 1681-1737 (marked config + renderer)
```

---

## Step 5: Fix extraStyles inline injection

Achieved by Step 1 `renderMarkdownContent()`: extraStyles is now inside `.resume-document`.

Rendered HTML structure:

```html
<div class="resume-document theme-blue">
  <style id="inline-extra-styles">/* user CSS */</style>
  <h1 class="resume-name">...</h1>
  <section class="section section--work">...</section>
</div>
```

`root.innerHTML` now includes full styles automatically — no extra injection step needed.

---

## Step 6: Fix `buildPdfHtmlDocument` — reuse `resumeMarkdownRaw`

File: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

Around line 534, replace hardcoded CSS with the already-imported `resumeMarkdownRaw`:

```typescript
import { RESUME_CSS, INLINE_STYLES_ID } from '@/composables/useResumeRenderer';

const buildPdfHtmlDocument = (innerHtml: string, themeClass: string): string => {
  // innerHtml from markdownToHtml() already has inline extraStyles
  // Extract it to move to <head> to avoid duplication
  const styleMatch = innerHtml.match(new RegExp(`<style id="${INLINE_STYLES_ID}">([\\s\\S]*?)<\\/style>`));
  const inlineStyles = styleMatch ? styleMatch[1] : '';
  const cleanInnerHtml = innerHtml.replace(new RegExp(`<style id="${INLINE_STYLES_ID}">[\\s\\S]*?<\\/style>\\n?`), '');

  const extraStylesBlock = inlineStyles.trim()
    ? `<style id="pdf-extra-styles">\n${inlineStyles}\n</style>`
    : '';

  return '<!DOCTYPE html>\n' +
    '<html lang="zh-CN">\n' +
    '<head>\n' +
    '  <meta charset="UTF-8">\n' +
    '  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n' +
    '  <style>\n' + RESUME_CSS + '\n  </style>\n' +
    '  ' + extraStylesBlock + '\n' +
    '</head>\n' +
    '<body>\n' +
    '  ' + cleanInnerHtml + '\n' +
    '</body>\n' +
    '</html>';
};
```

---

## Step 7: `ResumePreview.vue` uses MarkdownRenderer directly

File: `ai-interview-frontend/src/views/ResumePreview.vue`

```html
<MarkdownRenderer
  v-if="resumeMarkdown"
  :content="resumeMarkdown"
  :extraStyles="markdownExtraStyles"
  :themeClass="resumeThemeClass"
/>
```

Data source: `content_json.content` -> markdown, `content_json.extraStyles` -> styles, `content_json.themeClass` -> theme.

---

## Step 8: URL `?resumeId=` auto-select

File: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

```typescript
import { useRoute } from 'vue-router';
const route = useRoute();

onMounted(async () => {
  await initConversation();

  const urlResumeId = route.query.resumeId;
  if (urlResumeId && !currentResumeId.value) {
    const id = parseInt(urlResumeId as string);
    if (!isNaN(id)) {
      currentResumeId.value = id;
      handleResumeChange(id);
    }
  }
});
```

---

## Step 9: `rightPanelMode` save/restore

File: `ai-interview-frontend/src/views/ResumeGeneratorNew.vue`

Publish (around `handlePublish`):

```typescript
content_json: {
  ...getResumeDataToSave(),
  rightPanelMode: rightPanelMode.value,  // save preference
},
```

Load (around `handleResumeChange`):

```typescript
const savedMode = cleanedContent.rightPanelMode;
if (savedMode && ['markdown', 'print', 'electron'].includes(savedMode)) {
  rightPanelMode.value = savedMode;
}
```

---

## Step 10: Backend `resume_markdown` field

File: `ai_interview_backend/resumes/serializers.py`

```python
class ResumeDetailSerializer(serializers.ModelSerializer):
    resume_markdown = serializers.SerializerMethodField()

    class Meta:
        fields = [..., 'content_json', 'resume_markdown']

    def get_resume_markdown(self, obj):
        cj = obj.content_json
        if isinstance(cj, dict): return cj.get('content', '')
        if isinstance(cj, str): return cj
        return ''
```

---

## Step 11: ResumeEditor AI jump button

File: `ai-interview-frontend/src/views/ResumeEditor.vue`

```html
<el-button type="warning" @click="continueWithAI" :icon="Cpu">AI 继续编辑</el-button>
```

```typescript
import { Cpu } from '@element-plus/icons-vue';
import { useRouter } from 'vue-router';
const router = useRouter();

const continueWithAI = () => {
  router.push({ name: 'ResumeGenerator', query: { resumeId: String(resumeId) } });
};
```

---

## Class Naming Contract (all paths)

```
.resume-document              <- outer container
  <style id="inline-extra-styles">  <- user CSS (inline, in document)

section / .subsection        <- H2/H3+ containers
section-title                <- headings (with --type modifier)
.{type}-list / .item-list    <- lists
.{type}-item / .item         <- list items
.resume-name                 <- H1 (name)
```

All new code must respect this contract. No hardcoded inconsistent classes.

---

## Execution Order

1. **Step 0** — create `src/styles/resumeMarkdownCss.ts` (CSS as JS string, all paths depend on this)
2. **Step 1** — create `src/composables/useResumeRenderer.ts` (imports Step 0, exports `RESUME_CSS`)
3. **Step 2** — `MarkdownRenderer.vue` refactor (imports Step 1)
4. **Step 3** — `PdfPageView.vue` refactor (imports Step 1)
5. **Step 4** — `ResumeGeneratorNew.markdownToHtml()` refactor (imports Step 1)
6. **Step 5** — extraStyles inline (already done in Step 1 `renderMarkdownContent()`)
7. **Step 6** — `buildPdfHtmlDocument` uses `RESUME_CSS` (imports Step 1)
8. **Step 7** — `ResumePreview.vue` uses MarkdownRenderer
9. **Step 8** — URL auto-select
10. **Step 9** — rightPanelMode save/restore
11. **Step 10** — backend field
12. **Step 11** — ResumeEditor jump button

