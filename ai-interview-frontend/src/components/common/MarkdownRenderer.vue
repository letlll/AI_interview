<template>
  <div class="markdown-body" ref="markdownRoot"></div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from 'vue';
import mermaid from 'mermaid';
import katex from 'katex';
import { renderMarkdownContent, postProcessSectionsDOM } from '@/composables/useResumeRenderer';

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
mermaid.initialize({ startOnLoad: false, theme: 'default' });

// preprocessMarkdown / postProcessSections moved to @/composables/useResumeRenderer

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

// injectExtraStyles / INJECTED_STYLE_ID moved into renderMarkdownContent (extraStyles inline)

// ============================================================
// 核心渲染函数
// ============================================================
const renderAll = async () => {
  if (!markdownRoot.value || !props.content) return;

  // 使用 composable 渲染，extraStyles 已内联到 .resume-document 内部
  markdownRoot.value.innerHTML = renderMarkdownContent({
    content: props.content,
    themeClass: props.themeClass || 'theme-blue',
    extraStyles: props.extraStyles || '',
  });

  // 后处理 section 包装
  postProcessSectionsDOM(markdownRoot.value);

  await nextTick();

  // Mermaid 渲染
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

  // KaTeX 渲染
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

  // 为所有内容添加 contenteditable（排除特殊元素）
  markdownRoot.value.querySelectorAll('p, li, span, td, th, div:not(.mermaid-container):not(.katex-container):not(.resume-document)').forEach(el => {
    const element = el as HTMLElement;
    if (element.closest('[contenteditable="true"], pre, code, .mermaid-container, .katex-container, table, figure')) return;
    element.setAttribute('contenteditable', 'true');
  });

  attachEditableListeners();
};

// postProcessSections moved to @/composables/useResumeRenderer (postProcessSectionsDOM)

onMounted(() => { renderAll(); });
watch(() => props.content, () => { renderAll(); });
watch(() => props.themeClass, () => {
  const doc = markdownRoot.value?.querySelector('.resume-document');
  if (!doc) return;
  doc.classList.remove('theme-blue', 'theme-dark', 'theme-minimal', 'theme-classic', 'theme-modern');
  doc.classList.add(props.themeClass || 'theme-blue');
});
// extraStyles is handled by renderMarkdownContent — re-render on change
watch(() => props.extraStyles, () => { renderAll(); });

defineExpose({
  markdownRoot,
  appendExtraStyles(css: string) {
    emit('extra-styles-append', css);
    renderAll();
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
