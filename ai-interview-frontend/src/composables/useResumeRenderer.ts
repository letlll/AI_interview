/**
 * Shared resume markdown rendering pipeline.
 * Single source of truth for:
 *   - Marked instance configuration
 *   - Markdown preprocessing (strip meta comments)
 *   - HTML rendering (with extraStyles inline in .resume-document)
 *   - Section post-processing (DOM grouping by heading levels)
 *   - CSS constant (re-exported for buildPdfHtmlDocument)
 *
 * No DOM access, no Vue reactivity, no side effects.
 */

import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js';
import { RESUME_CSS } from '@/styles/resumeMarkdownCss';

export { RESUME_CSS };

// ============================================================
// Constants
// ============================================================
export const INLINE_STYLES_ID = 'inline-extra-styles';

// section type -> CSS class mappings (must match resumeMarkdownCss.ts)
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

// ============================================================
// Auto-detect section type from heading text
// Hybrid strategy: ^ start-of-string exact match first,
// then includes() substring fallback for non-standard headings.
// ============================================================
export function autoDetectSectionType(text: string): string {
  if (!text) return 'custom';
  const lower = text.toLowerCase().trim();

  // Phase 1: ^ start-of-string exact match (standard ## heading format)
  if (/^(工作|实习)/.test(lower)) return 'work';
  if (/^(项目)/.test(lower)) return 'projects';
  if (/^(教育|学校|学历)/.test(lower)) return 'education';
  if (/^(技能|技术|能力|证书)/.test(lower)) return 'skills';
  if (/^(个人|简介|关于|自我介绍|求职|评价)/.test(lower)) return 'summary';

  // Phase 2: includes() substring fallback (non-standard headings)
  if (lower.includes('experience') || lower.includes('work')) return 'work';
  if (lower.includes('竞赛') || lower.includes('大赛') || lower.includes('作品') || lower.includes('demo') || lower.includes('project')) return 'projects';
  if (lower.includes('education')) return 'education';
  if (lower.includes('skill')) return 'skills';
  if (lower.includes('summary') || lower.includes('about')) return 'summary';

  return 'custom';
}

// ============================================================
// Preprocess: strip meta comments
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
        // ### 日期拆解：检测 | 分隔符，左标题 + 右日期
        if (depth === 3) {
          const rawText = token.tokens?.map((t: any) => t.raw || t.text || '').join('') || '';
          const barIdx = rawText.indexOf('|');
          if (barIdx > 0) {
            const leftRaw = rawText.substring(0, barIdx).trim();
            const rightRaw = rawText.substring(barIdx + 1).trim();
            const slug = autoDetectSectionType(leftRaw);
            return `<h3 class="subsection-title" contenteditable="true" data-section-type="${slug}"><span class="project-title-text">${leftRaw}</span><span class="project-title-date">${rightRaw}</span></h3>\n`;
          }
        }
        const slug = autoDetectSectionType(inner.replace(/<[^>]+>/g, '').trim());
        if (depth === 2) {
          const titleClass = slug ? `section-title--${slug}` : '';
          return `<h2 class="section-title ${titleClass}" contenteditable="true" data-section-type="${slug}">${inner}</h2>\n`;
        }
        return `<h${depth} class="subsection-title" contenteditable="true" data-section-type="${slug}">${inner}</h${depth}>\n`;
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
// Build standalone HTML document for Electron PDF export
// Injects RESUME_CSS + themeStyles + customStyles as separate
// <style> blocks so theme switch replaces themeStyles only.
// Reuses the shared Marked instance (same as preview).
// ============================================================
export interface PdfHtmlOptions {
  content: string;
  themeStyles?: string;
  customStyles?: string;
}

export function buildPdfHtmlDocument(options: PdfHtmlOptions): string {
  const { content, themeStyles = '', customStyles = '' } = options;
  console.log('[buildPdfHtmlDocument] 入参:', {
    contentLen: content.length,
    themeStylesLen: themeStyles.length,
    customStylesLen: customStyles.length,
    themeStylesPreview: themeStyles.slice(0, 80),
    customStylesPreview: customStyles.slice(0, 80),
  });

  const marked = createMarkedInstance();
  const { markdown: cleanedMd } = preprocessMarkdown(content);
  const htmlContent = marked.parse(cleanedMd) as string;

  const themeStylesBlock = themeStyles.trim()
    ? `/* 主题 CSS — 切换主题时整套替换 */\n${themeStyles}`
    : '';
  const customStylesBlock = customStyles.trim()
    ? `/* 用户/AI 自定义 CSS — 切换主题时保留，排在 themeStyles 后自然覆盖 */\n${customStyles}`
    : '';

  console.log('[buildPdfHtmlDocument] CSS 块注入:', {
    hasThemeBlock: !!themeStylesBlock,
    hasCustomBlock: !!customStylesBlock,
    cssTotalLen: RESUME_CSS.length + themeStyles.length + customStyles.length,
  });

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
body { background: #ffffff; }

/* 基线 CSS（知网格式，与 Markdown 预览同源） */
${RESUME_CSS}

/* PDF 容器 reset：覆盖基线中的容器约束（排在 RESUME_CSS 后自然覆盖） */
.resume-document {
  max-width: unset;
  min-height: unset;
  margin: 0;
  padding: 0;
  box-shadow: none;
  border-radius: 0;
}

${themeStylesBlock}

${customStylesBlock}
</style>
</head>
<body>
<div class="resume-document">
${htmlContent}
</div>
</body>
</html>`;
}

// ============================================================
// Post-process DOM: group content by heading levels into sections
// Call this after setting innerHTML
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
