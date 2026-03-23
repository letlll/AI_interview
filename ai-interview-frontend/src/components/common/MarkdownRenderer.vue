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
}>();

const emit = defineEmits<{
  (e: 'section-title-change', payload: { oldTitle: string; newTitle: string; sectionType: string }): void;
  (e: 'content-change', markdown: string): void;
}>();

const markdownRoot = ref<HTMLDivElement | null>(null);

const markedInstance = new Marked();

markedInstance.use(markedHighlight({
  langPrefix: 'hljs language-',
  highlight(code: string, lang: string) {
    const language = hljs.getLanguage(lang) ? lang : 'plaintext';
    return hljs.highlight(code, { language }).value;
  }
}));

mermaid.initialize({
  startOnLoad: false,
  theme: 'default'
});

// section 类型直接来自元标记中的 key，pendingMetaKey 为空时 sectionType 为 undefined
// 不再做文本推断（避免 includes('技能') 等硬编码）

// 预处理 Markdown：将所有标题替换为带 contenteditable 的版本
function preprocessMarkdown(content: string): string {
  const lines = content.split('\n');
  const result: string[] = [];
  let pendingMetaKey = '';

  for (const line of lines) {
    const trimmed = line.trim();

    // 捕获元标记：<!-- section:xxx:title --> 或 <!--section:xxx:title-->
    // 用 [\s\S]*? 非贪心匹配含任意字符的内容（避免 [^>]+ 无法匹配含 > 的标题文本）
    // 匹配后：不向 result 追加任何内容（完全丢弃元注释）
    // 仅用 pendingMetaKey 为下一个标题的 data-section-type 提供 key
    const rawMeta = trimmed.match(/^<!--\s*section:([\w-]+):([\s\S]*?)\s*-->\s*$/);
    if (rawMeta) {
      pendingMetaKey = rawMeta[1];
      continue; // 完全丢弃，不输出到 marked
    }

    // 统一处理所有级别的标题 # 到 ######
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length; // 1-6
      const title = headingMatch[2].trim();
      const sectionType = pendingMetaKey || undefined;
      const escapedTitle = title.replace(/"/g, '&quot;');

      if (level === 1) {
        // 一级标题 # xxx → 姓名可编辑
        result.push(
          `<h1 class="resume-name" contenteditable="true" data-original-title="${escapedTitle}">${title}</h1>`
        );
      } else {
        // 二级到六级标题 ## 到 ######
        result.push(
          `<h${level} class="section-title section-title--${sectionType}" contenteditable="true" data-original-title="${escapedTitle}" data-section-type="${sectionType}">${title}</h${level}>`
        );
      }
      pendingMetaKey = '';
      continue;
    }

    result.push(line);
  }

  return result.join('\n');
}

// HTML → Markdown 转换函数
function htmlToMarkdown(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const body = doc.body;

  function processNode(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || '';
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return '';
    }

    const el = node as HTMLElement;
    const tagName = el.tagName.toLowerCase();

    // 跳过 Mermaid 容器和 KaTeX 容器
    if (el.classList.contains('mermaid-container') || el.classList.contains('katex-container')) {
      return el.getAttribute('data-original') || '';
    }

    switch (tagName) {
      case 'h1':
        return `# ${processChildren(el)}\n`;  // 一级标题为姓名，不加元注释
      case 'h2': {
        const title2 = processChildren(el);
        return `## ${title2}\n`;
      }
      case 'h3': {
        const title3 = processChildren(el);
        return `### ${title3}\n`;
      }
      case 'h4':
        return `#### ${processChildren(el)}\n`;
      case 'h5':
        return `##### ${processChildren(el)}\n`;
      case 'h6':
        return `###### ${processChildren(el)}\n`;
      case 'p':
        return `${processChildren(el)}\n`;
      case 'br':
        return '\n';
      case 'strong':
      case 'b':
        return `**${processChildren(el)}**`;
      case 'em':
      case 'i':
        return `*${processChildren(el)}*`;
      case 'code':
        if (el.classList.contains('hljs') || el.parentElement?.tagName === 'PRE') {
          return `\`${processChildren(el)}\``;
        }
        return `\`${processChildren(el)}\``;
      case 'pre':
        const code = el.querySelector('code');
        const lang = code?.className.match(/language-(\w+)/)?.[1] || '';
        return `\`\`\`${lang}\n${code?.textContent || el.textContent || ''}\n\`\`\`\n`;
      case 'ul':
        return Array.from(el.children).map(li => `- ${processChildren(li as HTMLElement)}`).join('\n') + '\n';
      case 'ol':
        return Array.from(el.children).map((li, i) => `${i + 1}. ${processChildren(li as HTMLElement)}`).join('\n') + '\n';
      case 'li':
        return processChildren(el);
      case 'a':
        return `[${processChildren(el)}](${el.getAttribute('href') || ''})`;
      case 'blockquote':
        return `> ${processChildren(el)}\n`;
      case 'hr':
        return '---\n';
      case 'div':
      case 'span':
        return processChildren(el);
      default:
        return processChildren(el);
    }
  }

  function processChildren(el: HTMLElement): string {
    return Array.from(el.childNodes).map(node => processNode(node)).join('');
  }

  return processChildren(body).replace(/\n{3,}/g, '\n\n').trim();
}

// 内容变化 debounce timer
let contentChangeTimer: number | null = null;

// 内容修改后触发事件（带 debounce）
function onContentChanged() {
  if (contentChangeTimer) clearTimeout(contentChangeTimer);
  contentChangeTimer = setTimeout(() => {
    if (!markdownRoot.value) return;
    const html = markdownRoot.value.innerHTML;
    const markdown = htmlToMarkdown(html);
    emit('content-change', markdown);
  }, 500) as unknown as number;
}

// 挂载 contenteditable 事件监听
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

      // 区分标题元素和正文元素
      if (element.tagName.match(/^H[1-6]$/)) {
        if (newValue !== originalValue) {
          onTitleChanged(element, originalValue, newValue);
        }
      } else {
        // 正文内容变化
        onContentChanged();
      }
    });

    element.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        // 标题元素按 Enter 结束编辑
        if (element.tagName.match(/^H[1-6]$/)) {
          e.preventDefault();
          element.blur();
        }
        // 正文元素允许换行，不阻止默认行为
      }
      if (e.key === 'Escape') {
        element.textContent = originalValue;
        element.blur();
      }
    });
  });
}

// 标题修改后触发事件
function onTitleChanged(element: HTMLElement, oldTitle: string, newTitle: string) {
  emit('section-title-change', {
    oldTitle,
    newTitle,
    sectionType: element.dataset.sectionType || 'custom'
  });
  // 同时触发内容变化
  onContentChanged();
}

const renderAll = async () => {
  if (!markdownRoot.value || !props.content) return;

  // 预处理：追加 contenteditable 和 section 类型
  const processed = preprocessMarkdown(props.content);
  markdownRoot.value.innerHTML = markedInstance.parse(processed) as string;

  await nextTick();

  // 渲染 Mermaid
  try {
    const mermaidElements = markdownRoot.value.querySelectorAll('code.language-mermaid');
    const promises = Array.from(mermaidElements).map(async (el, index) => {
      const id = `mermaid-chart-${Date.now()}-${index}`;
      const pre = el.parentElement;
      if (pre) {
        try {
          const { svg } = await mermaid.render(id, el.textContent || '');
          const container = document.createElement('div');
          container.innerHTML = svg;
          container.classList.add('mermaid-container');
          container.setAttribute('data-original', `\`\`\`mermaid\n${el.textContent || ''}\n\`\`\``);
          pre.replaceWith(container);
        } catch(e) {
          console.error('Mermaid render error:', e);
          const errorNode = document.createElement('div');
          errorNode.innerText = 'Mermaid diagram failed to render.';
          pre.replaceWith(errorNode);
        }
      }
    });
    await Promise.all(promises);
  } catch (error) {
    console.error('Error processing Mermaid elements:', error);
  }

  // 渲染 KaTeX
  try {
    const katexElements = markdownRoot.value.querySelectorAll('code.language-katex');
    katexElements.forEach(el => {
      const pre = el.parentElement;
      if (pre) {
        try {
          const html = katex.renderToString(el.textContent || '', {
            throwOnError: false,
            displayMode: true
          });
          const container = document.createElement('div');
          container.innerHTML = html;
          container.classList.add('katex-container');
          container.setAttribute('data-original', `\`\`\`katex\n${el.textContent || ''}\n\`\`\``);
          pre.replaceWith(container);
        } catch(e) {
          console.error('KaTeX render error:', e);
          const errorNode = document.createElement('div');
          errorNode.innerText = 'KaTeX formula failed to render.';
          pre.replaceWith(errorNode);
        }
      }
    });
  } catch (error) {
    console.error('Error processing KaTeX elements:', error);
  }

  // 为所有正文内容添加 contenteditable（排除代码块、Mermaid、KaTeX 等特殊元素）
  markdownRoot.value.querySelectorAll('p, li, span, td, th').forEach(el => {
    const element = el as HTMLElement;
    // 跳过已标记为可编辑的标题元素
    if (element.closest('[data-section-type]')) return;
    // 跳过代码块内的元素
    if (element.closest('pre, code')) return;
    // 跳过 Mermaid/KaTeX 容器内的元素
    if (element.closest('.mermaid-container, .katex-container')) return;
    // 跳过 table 内的元素（表格整体可编辑）
    if (element.closest('table')) return;

    element.setAttribute('contenteditable', 'true');
  });

  // 挂载可编辑事件
  attachEditableListeners();
};

onMounted(renderAll);
watch(() => props.content, renderAll);
</script>

<style scoped>
/* 基础容器 */
:deep(.markdown-body) {
  line-height: 1.75;
  font-size: 16px;
}

/* 简历文档容器 */
:deep(.resume-document) {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: #ffffff;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 1000px;
}

/* Markdown 通用样式（resume-markdown.css 未覆盖的部分兜底） */
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