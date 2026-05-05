<template>
  <div class="markdown-body" ref="markdownRoot"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import { Marked } from 'marked';
import { markedHighlight } from "marked-highlight";
import hljs from 'highlight.js';
import mermaid from 'mermaid';
import katex from 'katex';

import 'highlight.js/styles/atom-one-dark.css';
import 'katex/dist/katex.min.css';
import '@/assets/styles/resume-markdown.css';

const props = defineProps<{
  content: string;
  themeClass?: string;
  extraStyles?: string;
}>();

const emit = defineEmits<{
  (e: 'section-title-change', payload: { oldTitle: string; newTitle: string; sectionType: string }): void;
  (e: 'content-change', markdown: string): void;
  (e: 'extra-styles-append', css: string): void;
}>();

const markdownRoot = ref<HTMLDivElement | null>(null);

// ============================================================
// 跟踪当前 section 类型（供 renderer 闭包访问）
// ============================================================
let currentSectionType = '';

// ============================================================
// Marked 实例配置（使用 marked.use 扩展）
// ============================================================
const markedInstance = new Marked();

markedInstance.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

// marked v16+：块级/行内内容在 token.tokens 里，必须用 parser 解析；List 用 items[] 而非 body
markedInstance.use({
  renderer: {
    heading(this: any, token: any): string {
      const depth = token.depth;
      const plainTitle = String(token.text || '');
      const inner = this.parser.parseInline(token.tokens);
      if (depth === 1) {
        return `<h1 class="resume-name" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}">${inner}</h1>\n`;
      }
      const slug = currentSectionType ? `section-title--${currentSectionType}` : '';
      const classes = ['section-title', slug, `h${depth}`].filter(Boolean).join(' ');
      return `<h${depth} class="${classes}" contenteditable="true" data-original-title="${plainTitle.replace(/"/g, '&quot;')}" data-section-type="${currentSectionType}">${inner}</h${depth}>\n`;
    },

    list(this: any, token: any): string {
      const ordered = token.ordered;
      let body = '';
      for (const item of token.items) {
        body += this.listitem(item);
      }
      let listClass = 'item-list';
      if (currentSectionType === 'skills' || currentSectionType === 'skill') {
        listClass = 'skills-list';
      } else if (currentSectionType === 'summary') {
        listClass = 'summary-list';
      } else if (currentSectionType) {
        listClass = `${currentSectionType}-list`;
      }
      const tag = ordered ? 'ol' : 'ul';
      const start = ordered && token.start !== 1 && token.start !== '' ? ` start="${token.start}"` : '';
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
        } else {
          prefix = `${cb} `;
        }
      }
      const inner = this.parser.parse(token.tokens, !!token.loose);
      let itemClass = 'item';
      if (currentSectionType === 'skills' || currentSectionType === 'skill') {
        itemClass = 'skill-item';
      } else if (currentSectionType === 'summary') {
        itemClass = 'summary-item';
      } else if (currentSectionType === 'work') {
        itemClass = 'work-item';
      } else if (currentSectionType === 'projects' || currentSectionType === 'project') {
        itemClass = 'project-item';
      } else if (currentSectionType === 'education') {
        itemClass = 'education-item';
      }
      return `<li class="${itemClass}">${prefix}${inner}</li>\n`;
    },

    paragraph(this: any, token: any): string {
      const inner = this.parser.parseInline(token.tokens);
      return `<p class="paragraph">${inner}</p>\n`;
    },

    link(this: any, token: any): string {
      const inner = this.parser.parseInline(token.tokens);
      const titleAttr = token.title ? ` title="${token.title}"` : '';
      return `<a class="link" href="${token.href}"${titleAttr} target="_blank">${inner}</a>`;
    },

    image(this: any, token: any): string {
      let alt = token.text;
      if (token.tokens?.length) {
        alt = this.parser.parseInline(token.tokens, this.parser.textRenderer);
      }
      const titleAttr = token.title ? ` title="${token.title}"` : '';
      return `<figure class="image-figure"><img class="image" src="${token.href}" alt="${alt}"${titleAttr} />${alt ? `<figcaption class="image-caption">${alt}</figcaption>` : ''}</figure>`;
    },

    blockquote(this: any, token: any): string {
      const inner = this.parser.parse(token.tokens);
      return `<blockquote class="blockquote">\n${inner}</blockquote>\n`;
    },

    code(this: any, token: any): string {
      const langClass = token.lang ? ` language-${token.lang}` : '';
      return `<pre class="code-block"><code class="code${langClass}">${token.text}</code></pre>\n`;
    },

    codespan(this: any, token: any): string {
      return `<code class="inline-code">${token.text}</code>`;
    },

    strong(this: any, token: any): string {
      const inner = this.parser.parseInline(token.tokens);
      return `<strong class="bold">${inner}</strong>`;
    },

    em(this: any, token: any): string {
      const inner = this.parser.parseInline(token.tokens);
      return `<em class="italic">${inner}</em>`;
    },

    del(this: any, token: any): string {
      const inner = this.parser.parseInline(token.tokens);
      return `<del class="strikethrough">${inner}</del>`;
    },

    hr(): string {
      return `<hr class="divider" />\n`;
    },

    table(this: any, token: any): string {
      let headerRow = '';
      for (const cell of token.header) {
        headerRow += this.tablecell(cell);
      }
      const thead = this.tablerow({ text: headerRow });
      let body = '';
      for (const row of token.rows) {
        let rowHtml = '';
        for (const cell of row) {
          rowHtml += this.tablecell(cell);
        }
        body += this.tablerow({ text: rowHtml });
      }
      const tbody = body ? `<tbody class="table-body">${body}</tbody>` : '';
      return `<div class="table-wrapper"><table class="table">
      <thead class="table-head">${thead}</thead>
      ${tbody}
    </table></div>\n`;
    },

    tablerow(this: any, row: { text: string }): string {
      return `<tr class="table-row">${row.text}</tr>\n`;
    },

    tablecell(this: any, cell: any): string {
      const content = this.parser.parseInline(cell.tokens);
      const tag = cell.header ? 'th' : 'td';
      const alignClass = cell.align ? ` text-${cell.align}` : '';
      return `<${tag} class="table-cell${alignClass}">${content}</${tag}>\n`;
    },
  }
});

mermaid.initialize({ startOnLoad: false, theme: 'default' });

// ============================================================
// Markdown 预处理：提取元标记，替换为可渲染结构
// ============================================================
// 元标记格式：<!-- section:TYPE -->  或  <!-- section:TYPE:标题 -->
function preprocessMarkdown(content: string) {
  currentSectionType = '';
  const lines = content.split('\n');
  const output: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // 捕获元标记
    const metaMatch = trimmed.match(/^<!--\s*(?:section:|type:)([\w-]+)(?::([\s\S]*?))?\s*-->\s*$/);
    if (metaMatch) {
      // 更新当前 section 类型（供 renderer 闭包使用）
      currentSectionType = metaMatch[1];
      // 不输出到 marked
      continue;
    }

    output.push(line);
  }

  return output.join('\n');
}

// ============================================================
// HTML → Markdown 转换（保留 data-* 属性实现双向同步）
// ============================================================
function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || '';
    if (node.nodeType !== Node.ELEMENT_NODE) return '';

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    if (el.classList.contains('mermaid-container') || el.classList.contains('katex-container')) {
      return el.getAttribute('data-original') || '';
    }

    switch (tagName) {
      case 'h1': {
        const text = processChildren(el);
        const sectionMeta = el.dataset.sectionType;
        return sectionMeta ? `<!-- section:${sectionMeta} -->\n# ${text}\n` : `# ${text}\n`;
      }
      case 'h2': {
        const text = processChildren(el);
        const sectionMeta = el.dataset.sectionType;
        return sectionMeta ? `<!-- section:${sectionMeta} -->\n## ${text}\n` : `## ${text}\n`;
      }
      case 'h3': return `### ${processChildren(el)}\n`;
      case 'h4': return `#### ${processChildren(el)}\n`;
      case 'h5': return `##### ${processChildren(el)}\n`;
      case 'h6': return `###### ${processChildren(el)}\n`;
      case 'p': return `${processChildren(el)}\n`;
      case 'br': return '\n';
      case 'strong':
      case 'b': return `**${processChildren(el)}**`;
      case 'em':
      case 'i': return `*${processChildren(el)}*`;
      case 'del': return `~~${processChildren(el)}~~`;
      case 'code': {
        const parent = el.parentElement;
        if (parent?.tagName === 'PRE' || el.classList.contains('hljs')) {
          const langClass = Array.from(el.classList).find(c => c.startsWith('language-'));
          const lang = langClass ? langClass.replace('language-', '') : '';
          return `\`\`\`${lang}\n${el.textContent || ''}\n\`\`\`\n`;
        }
        return `\`${el.textContent || ''}\``;
      }
      case 'pre': {
        const code = el.querySelector('code');
        const langClass = Array.from(code?.classList || []).find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : '';
        return `\`\`\`${lang}\n${code?.textContent || ''}\n\`\`\`\n`;
      }
      case 'a': {
        const href = el.getAttribute('href') || '';
        const text = processChildren(el);
        // 去掉 mailto: mailto: 前缀，保持纯邮箱格式
        const cleanHref = href.startsWith('mailto:') ? href.replace('mailto:', '') : href;
        if (cleanHref === text || !cleanHref) return text;
        return `[${text}](${cleanHref})`;
      }
      case 'blockquote': return `> ${processChildren(el)}\n`;
      case 'hr': return '---\n';
      case 'ul': {
        return Array.from(el.children).map(li => `- ${processChildren(li as HTMLElement)}`).join('\n') + '\n';
      }
      case 'ol': {
        return Array.from(el.children).map((li, i) => `${i + 1}. ${processChildren(li as HTMLElement)}`).join('\n') + '\n';
      }
      case 'li': return processChildren(el);
      case 'figure': {
        const img = el.querySelector('img');
        const caption = el.querySelector('figcaption');
        const alt = img?.getAttribute('alt') || '';
        const src = img?.getAttribute('src') || '';
        return caption ? `![${alt}](${src})\n*${caption.textContent}*\n` : `![${alt}](${src})\n`;
      }
      case 'style':
      case 'script':
        return '';
      case 'table': {
        // marked renders tables as <table>...</table> HTML blocks.
        // Convert back to markdown table syntax for clean round-trip.
        const thead = el.querySelector('thead');
        const tbody = el.querySelector('tbody');
        const headerCells = thead
          ? Array.from(thead.querySelectorAll('th, td')).map(th => (th as HTMLElement).textContent?.trim() || '')
          : Array.from(el.querySelectorAll('tr')).find(tr => tr.querySelector('th'))
            ? Array.from(el.querySelector('tr')!.querySelectorAll('th, td')).map(td => (td as HTMLElement).textContent?.trim() || '')
            : [];
        const rows: string[] = [];
        if (headerCells.length > 0) {
          rows.push('| ' + headerCells.join(' | ') + ' |');
          rows.push('| ' + headerCells.map(() => '---').join(' | ') + ' |');
        }
        const bodyRows = tbody ? tbody.querySelectorAll('tr') : el.querySelectorAll('tbody tr, tr:not(:has(th))');
        bodyRows.forEach(tr => {
          const cells = Array.from(tr.querySelectorAll('td')).map(td => (td as HTMLElement).textContent?.trim() || '');
          if (cells.length > 0) rows.push('| ' + cells.join(' | ') + ' |');
        });
        return rows.join('\n') + '\n';
      }
      case 'tbody': {
        return Array.from(el.children).map(tr => {
          const cells = Array.from(tr.children).map(td => (td as HTMLElement).textContent?.trim() || '');
          return '| ' + cells.join(' | ') + ' |';
        }).join('\n') + '\n';
      }
      case 'div':
      case 'span':
      case 'section':
        return handleDiv(el);
      default:
        return processChildren(el);
    }
  }

  function processChildren(el: HTMLElement): string {
    return Array.from(el.childNodes).map(processNode).join('');
  }

  // ============================================================
  // 智能识别常见 HTML 结构，转换为 Markdown
  // ============================================================
  function handleDiv(el: HTMLElement): string {
    // 0. 原样保留 HTML 块：marked 会原样保留，不会被当作普通文本
    if (el.tagName === 'TABLE' || el.tagName === 'TBODY' || el.tagName === 'THEAD') {
      return el.outerHTML + '\n';
    }

    // 1. 基本信息卡片：提取内部 table 的 outerHTML，让 marked 原样渲染表格结构
    if (el.classList.contains('resume-basic-info') || el.id === 'resume-basic-info') {
      const table = el.querySelector('table');
      if (table) {
        return table.outerHTML + '\n';
      }
      // Fallback: strip contenteditable/data-* attributes
      return el.innerHTML.replace(/ (contenteditable|data-listener-attached)="[^"]*"/g, '') + '\n';
    }

    // 2. 单行 key-value 块：div.info-row / div.row / div.line
    if (el.classList.contains('info-row') || el.classList.contains('info-line') || el.classList.contains('row')) {
      const children = Array.from(el.children);
      if (children.length === 2) {
        const key = (children[0] as HTMLElement).textContent?.trim() || '';
        const value = processChildren(children[1] as HTMLElement);
        return value ? `${key}：${value}\n` : '';
      }
    }

    // 3. 键值对 div.kv / div.key-value
    if (el.classList.contains('kv') || el.classList.contains('key-value') || el.classList.contains('keyvalue')) {
      const children = Array.from(el.children);
      if (children.length >= 2) {
        const key = (children[0] as HTMLElement).textContent?.trim() || '';
        const value = processChildren(children[children.length - 1] as HTMLElement);
        return value ? `${key}：${value}\n` : '';
      }
    }

    // 4. 带有 label/value 结构的任意容器
    const infoItems = el.querySelectorAll(':scope > .info-item, :scope > .item, :scope > .row-item');
    if (infoItems.length > 0) {
      const lines = Array.from(infoItems)
        .map(item => {
          const label = item.querySelector('.label, .key, .name')?.textContent?.trim() || '';
          const valueEl = item.querySelector('.value, .val, .content');
          const value = valueEl
            ? processChildren(valueEl as HTMLElement)
            : (item as HTMLElement).textContent?.replace(label, '').trim() || '';
          return value ? `${label}：${value}` : label;
        })
        .filter(Boolean);
      if (lines.length > 0) return lines.join('  |  ') + '\n';
    }

    // 回退：按子元素类型分别处理
    const children = Array.from(el.children);
    if (children.length === 0) return processChildren(el);

    // 如果子元素都是 block 级（p, div, h*, section），直接拼接
    const blockTags = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'section', 'blockquote', 'ul', 'ol', 'figure', 'hr', 'pre']);
    if (children.every(c => blockTags.has((c as HTMLElement).tagName.toLowerCase()))) {
      return processChildren(el);
    }

    // 混合块：每个 block 子元素占一行，非 block 子元素内容合并
    return processChildren(el);
  }

  return processChildren(body).replace(/\n{3,}/g, '\n\n').trim();
}

// ============================================================
// 内容变化 debounce
// ============================================================
let contentChangeTimer: number | null = null;

function onContentChanged() {
  if (contentChangeTimer) clearTimeout(contentChangeTimer);
  contentChangeTimer = setTimeout(() => {
    if (!markdownRoot.value) return;
    const markdown = htmlToMarkdown(markdownRoot.value.innerHTML);
    emit('content-change', markdown);
  }, 500) as unknown as number;
}

// ============================================================
// contenteditable 事件监听
// ============================================================
function attachEditableListeners() {
  if (!markdownRoot.value) return;

  markdownRoot.value.querySelectorAll('[contenteditable="true"]').forEach(el => {
    const element = el as HTMLElement;
    if (element.dataset.listenerAttached) return;
    element.dataset.listenerAttached = 'true';

    let originalValue = '';

    element.addEventListener('focus', () => {
      originalValue = element.textContent || '';
      element.classList.add('is-editing');
    });

    element.addEventListener('blur', () => {
      element.classList.remove('is-editing');
      const newValue = element.textContent?.trim() || '';
      if (element.tagName.match(/^H[1-6]$/)) {
        if (newValue !== originalValue) {
          emit('section-title-change', {
            oldTitle: originalValue,
            newTitle: newValue,
            sectionType: element.dataset.sectionType || 'custom'
          });
        }
      }
      onContentChanged();
    });

    element.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' && element.tagName.match(/^H[1-6]$/)) {
        e.preventDefault();
        element.blur();
      }
      if (e.key === 'Escape') {
        element.textContent = originalValue;
        element.blur();
      }
    });
  });
}

// ============================================================
// 用户自定义样式注入
// ============================================================
const INJECTED_STYLE_ID = 'user-extra-styles';

function injectExtraStyles() {
  if (!markdownRoot.value) return;
  let styleEl = document.getElementById(INJECTED_STYLE_ID);
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = INJECTED_STYLE_ID;
    markdownRoot.value.appendChild(styleEl);
  }
  styleEl.textContent = props.extraStyles ?? '';
}

// ============================================================
// 核心渲染函数
// ============================================================
const renderAll = async () => {
  if (!markdownRoot.value || !props.content) return;

  // 1. 预处理：去掉元注释、更新 currentSectionType，得到干净 Markdown
  const cleanedMd = preprocessMarkdown(props.content);

  // 2. 渲染 Markdown → HTML（必须用清洗后的字符串，否则 <!-- --> 会进解析器）
  const html = markedInstance.parse(cleanedMd) as string;

  // 3. 组装最终结构
  markdownRoot.value.innerHTML = `<div class="resume-document">${html}</div>`;

  // 4. 后处理：section 包装（用 DOM 操作）
  postProcessSections(markdownRoot.value);

  // 5. 主题 class
  const doc = markdownRoot.value.querySelector('.resume-document');
  if (doc) {
    doc.classList.remove('theme-blue', 'theme-dark', 'theme-minimal', 'theme-classic', 'theme-modern');
    doc.classList.add(props.themeClass || 'theme-blue');
  }

  // 6. 注入用户样式
  injectExtraStyles();

  await nextTick();

  // 7. Mermaid 渲染
  try {
    const mermaidElements = markdownRoot.value.querySelectorAll('code.language-mermaid');
    await Promise.all(Array.from(mermaidElements).map(async (el, index) => {
      const pre = (el as HTMLElement).parentElement;
      if (!pre) return;
      try {
        const { svg } = await mermaid.render(`mermaid-${Date.now()}-${index}`, el.textContent || '');
        const container = document.createElement('div');
        container.innerHTML = svg;
        container.classList.add('mermaid-container');
        container.setAttribute('data-original', `\`\`\`mermaid\n${el.textContent}\n\`\`\``);
        pre.replaceWith(container);
      } catch (e) {
        pre.replaceWith(Object.assign(document.createElement('div'), { textContent: 'Mermaid diagram failed to render.' }));
      }
    }));
  } catch {}

  // 8. KaTeX 渲染
  try {
    markdownRoot.value.querySelectorAll('code.language-katex').forEach(el => {
      const pre = (el as HTMLElement).parentElement;
      if (!pre) return;
      try {
        const container = document.createElement('div');
        container.innerHTML = katex.renderToString(el.textContent || '', { throwOnError: false, displayMode: true });
        container.classList.add('katex-container');
        container.setAttribute('data-original', `\`\`\`katex\n${el.textContent}\n\`\`\``);
        pre.replaceWith(container);
      } catch {}
    });
  } catch {}

  // 9. 为所有内容添加 contenteditable（排除特殊元素）
  markdownRoot.value.querySelectorAll('p, li, span, td, th, div:not(.mermaid-container):not(.katex-container):not(.resume-document)').forEach(el => {
    const element = el as HTMLElement;
    if (element.closest('[contenteditable="true"], pre, code, .mermaid-container, .katex-container, table, figure')) return;
    element.setAttribute('contenteditable', 'true');
  });

  attachEditableListeners();
};

// ============================================================
// 后处理：按 Obsidian Reading View 原则对 heading 做分组
// 遇到同级或更高级（数字更小）的 heading 时，结束当前 section
// ============================================================
function postProcessSections(root: HTMLElement) {
  const doc = root.querySelector('.resume-document');
  if (!doc) return;

  const children = Array.from(doc.children);
  // 使用栈维护嵌套层级：[H2 section, H3 subsection, H4 subsubsection, ...]
  const stack: HTMLElement[] = [];

  children.forEach(child => {
    const el = child as HTMLElement;
    const headingMatch = el.tagName.match(/^H([1-6])$/);

    if (!headingMatch) {
      // 非标题节点：加入栈顶 section（深嵌套优先）
      if (stack.length > 0) {
        stack[stack.length - 1].appendChild(el);
      } else {
        doc.appendChild(el);
      }
      return;
    }

    const level = parseInt(headingMatch[1]);

    // 弹出所有 >= 当前 level 的 section（同级或更高级 → 结束）
    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const topLevel = parseInt(top.dataset.headingLevel || '0');
      if (topLevel >= level) {
        // 该 subsection 已结束，将其从其父元素移到 .resume-document
        const parent = top.parentElement;
        if (parent && parent !== doc) {
          while (top.firstChild) {
            parent.insertBefore(top.firstChild, top);
          }
          parent.removeChild(top);
        }
        stack.pop();
      } else {
        break;
      }
    }

    // 确定 section 类型：H2 继承 data-section-type，H3+ 总是 subsection
    const sectionType =
      level === 2 ? (el.dataset.sectionType || 'custom') : 'subsection';

    const section = document.createElement('section');
    section.className =
      level === 2
        ? `section section--${sectionType}`
        : 'subsection';
    section.dataset.headingLevel = String(level);

    el.classList.add('section-title');
    if (level === 2) {
      el.classList.add(`section-title--${sectionType}`);
    } else {
      el.classList.add('subsection-title');
    }

    section.appendChild(el);

    if (stack.length === 0) {
      // 顶层（H2）section：直接插入 doc
      doc.appendChild(section);
    } else {
      // 子 section：加入父 section（H2 或更深的 subsection）
      stack[stack.length - 1].appendChild(section);
    }

    stack.push(section);
  });

  // 栈中剩余的 subsection 需要合并到父 section 中
  while (stack.length > 1) {
    const top = stack.pop()!;
    const parent = stack[stack.length - 1];
    while (top.firstChild) {
      parent.appendChild(top.firstChild);
    }
  }
}

onMounted(() => { renderAll(); });
watch(() => props.content, () => { renderAll(); });
watch(() => props.themeClass, () => {
  const doc = markdownRoot.value?.querySelector('.resume-document');
  if (!doc) return;
  doc.classList.remove('theme-blue', 'theme-dark', 'theme-minimal', 'theme-classic', 'theme-modern');
  doc.classList.add(props.themeClass || 'theme-blue');
  injectExtraStyles();
});
watch(() => props.extraStyles, injectExtraStyles);

defineExpose({
  markdownRoot,
  appendExtraStyles(css: string) {
    emit('extra-styles-append', css);
    injectExtraStyles();
  }
});
</script>

<style scoped>
:deep(.markdown-body) {
  height: 100%;
  overflow: auto;
}

:deep(.resume-document) {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 1000px;
}

/* Markdown 通用样式兜底 */
:deep(.markdown-body h1),
:deep(.markdown-body h2),
:deep(.markdown-body h3) {
  border-bottom: 1px solid #eaecef;
  padding-bottom: 0.3em;
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
}
:deep(.markdown-body h1) { font-size: 2em; }
:deep(.markdown-body h2) { font-size: 1.5em; }
:deep(.markdown-body h3) { font-size: 1.25em; }
:deep(.markdown-body p) { margin-bottom: 16px; }
:deep(.markdown-body blockquote) {
  padding: 0 1em;
  color: #6a737d;
  border-left: 0.25em solid #dfe2e5;
  margin-bottom: 16px;
}
:deep(.markdown-body ul),
:deep(.markdown-body ol) {
  padding-left: 2em;
  margin-bottom: 16px;
}
:deep(.markdown-body code) {
  padding: 0.2em 0.4em;
  margin: 0;
  font-size: 85%;
  background-color: rgba(27, 31, 35, 0.05);
  border-radius: 3px;
}
:deep(.markdown-body pre) {
  word-break: break-all;
  white-space: pre-wrap;
  background-color: #282c34;
  border-radius: 6px;
  padding: 16px;
  margin-bottom: 16px;
  overflow: auto;
}
:deep(.markdown-body pre code) {
  padding: 0;
  margin: 0;
  font-size: inherit;
  background: transparent;
}
:deep(.markdown-body table) {
  display: block;
  width: 100%;
  overflow: auto;
  border-collapse: collapse;
  margin-bottom: 16px;
}
:deep(.markdown-body tr) { background-color: #fff; border-top: 1px solid #c6cbd1; }
:deep(.markdown-body th),
:deep(.markdown-body td) { padding: 6px 13px; border: 1px solid #dfe2e5; }
:deep(.markdown-body .mermaid-container) { text-align: center; margin-bottom: 16px; }
</style>
