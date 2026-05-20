<template>
  <div class="pdf-page-view" v-show="visible">
    <!-- 隐藏内容源：内容在此自然流开，JS 通过 scrollHeight 测量总高度 -->
    <div ref="contentRef" class="pdf-content-source" />

    <!-- 可视页堆叠容器：高度由 JS 设为 pageCount * A4_HEIGHT_PX -->
    <div class="pdf-pages-container" ref="containerRef">
      <div
        v-for="i in pageCount"
        :key="i"
        class="pdf-page-shell"
        :style="{
          width: `${A4_WIDTH_PX}px`,
          height: `${A4_HEIGHT_PX}px`,
          top: `${(i - 1) * PAGE_LAYOUT_HEIGHT_PX}px`,
          /* 每页实际占位 = 1123 + 3 = 1126px；灰缝在 page-shell 下方 */
        }"
      >
        <!-- 页间阴影分隔线（第 2 页起显示） -->
        <div v-if="i > 1" class="page-break-indicator" />

        <!-- 页码角标 -->
        <div class="page-number">{{ i }} / {{ pageCount }}</div>

        <div
          :ref="el => setPageRef(i, el)"
          class="pdf-page-inner"
          :style="{
            width: `${A4_WIDTH_PX}px`,
            height: `${A4_HEIGHT_PX}px`,
          }"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A4 分页预览：所见即所得，分页发生在 DOM 层而非像素层。
 * A4 物理尺寸：595.28 × 841.89 pt  |  预览像素：794 × 1123 px（96dpi）
 *
 * 分页策略（像素裁窗 + 合法断点补偿）：
 * 1. 测量：隐藏源 div 设置 height:auto / overflow:visible，读取 scrollHeight
 * 2. 算页：n = ceil(scrollHeight / A4_HEIGHT_PX)，以整页高度为单位
 * 3. 渲染：每页固定 1123px，通过 translateY 切出区间
 * 4. 补偿：clone padding-top 补偿上一页被切掉的末行，让标题级块尽量整块移动
 */
import { ref, watch, nextTick, onMounted, onUnmounted } from 'vue';
import { ElMessage } from 'element-plus';

import { renderMarkdownContent, postProcessSectionsDOM } from '@/composables/useResumeRenderer';

const props = defineProps<{
  content?: string;
  extraStyles?: string;
  visible?: boolean;
}>();

const emit = defineEmits<{ (e: 'pages-changed', count: number): void }>();

// ============================================================
// 常量
// ============================================================
const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
// 页间垂直间距（px），预览层显示灰缝，不参与 translateY 偏移量计算
const PAGE_GAP_PX = 10;

// 容器布局用 slot 高度（含页间距），供 page-shell top 定位
const PAGE_LAYOUT_HEIGHT_PX = A4_HEIGHT_PX + PAGE_GAP_PX; // 1126

// ============================================================
// marked instance + renderer + preprocess + postProcess moved to @/composables/useResumeRenderer
// ============================================================

// ============================================================
// 模板 ref
// ============================================================
const containerRef = ref<HTMLDivElement | null>(null);
const contentRef = ref<HTMLDivElement | null>(null);
const pageRefs = ref<HTMLElement[]>([]);
const pageCount = ref(1);

const setPageRef = (i: number, el: any) => {
  if (el) pageRefs.value[i - 1] = el as HTMLElement;
  else delete pageRefs.value[i - 1];
};

// ============================================================
// 等待字体加载（避免字体回退导致 scrollHeight 不准确）
// ============================================================
const waitForFonts = (): Promise<void> => {
  if (document.fonts && document.fonts.ready) {
    return document.fonts.ready.then(() => Promise.resolve());
  }
  // 回退：等待足够长的时间（约 800ms），覆盖大多数字体加载场景
  return new Promise(resolve => setTimeout(resolve, 800));
};

// ============================================================
// 渲染内容
// ============================================================
const renderContent = () => {
  const el = contentRef.value;
  if (!el || !props.content) {
    console.warn('[PdfPageView renderContent] 提前返回：el 或 content 为空', {
      hasEl: !!el,
      contentLen: props.content?.length ?? 0,
    });
    return;
  }

  // 使用 composable，extraStyles 已内联到 .resume-document 内部
  el.innerHTML = renderMarkdownContent({
    content: props.content,
    extraStyles: props.extraStyles || '',
  });
  postProcessSectionsDOM(el);
};

// ============================================================
// 重新计算分页
// ============================================================
const recalculate = async () => {
  await nextTick();
  // 等待 Vue DOM 更新 + 字体加载完成（避免字体回退导致 scrollHeight 不准确）
  await Promise.all([
    nextTick(),
    waitForFonts(),
  ]);

  const contentEl = contentRef.value;
  const containerEl = containerRef.value;

  if (!contentEl || !containerEl) {
    console.warn('[PdfPageView recalculate] 缺少 DOM ref，提前返回');
    return;
  }

  // 展开隐藏源以获取真实内容高度
  contentEl.style.height = 'auto';
  contentEl.style.overflow = 'visible';
  contentEl.style.visibility = 'hidden'; // 仍然隐藏，但允许布局
  await nextTick();

  // 强制重新布局（双重测量确保准确）
  const totalH = contentEl.scrollHeight;
  const rawPages = totalH / A4_HEIGHT_PX;
  const n = Math.max(1, Math.ceil(rawPages));

  console.log('[PdfPageView recalculate] 分页计算', {
    totalH,
    rawPages: rawPages.toFixed(3),
    pageCount: n,
    containerHeight: `${n * A4_HEIGHT_PX + (n - 1) * PAGE_GAP_PX}px`,
    PAGE_GAP_PX,
    PAGE_LAYOUT_HEIGHT_PX: A4_HEIGHT_PX + PAGE_GAP_PX,
  });

  // 容器总高 = n 页纸 + (n-1) 个灰缝
  containerEl.style.height = `${n * A4_HEIGHT_PX + (n - 1) * PAGE_GAP_PX}px`;
  pageCount.value = n;

  await nextTick();
  emit('pages-changed', n);

  // 渲染每页内容
  renderVisiblePages();
};

// ============================================================
// 构建克隆元素的共享样式
// ============================================================
const applyCloneStyles = (clone: HTMLElement, totalHeight: number) => {
  clone.style.position = 'absolute';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.width = `${A4_WIDTH_PX}px`;
  clone.style.height = `${totalHeight}px`;
  clone.style.padding = '0px';
  clone.style.boxSizing = 'border-box';
  clone.style.fontSize = '14px';
  clone.style.lineHeight = '1.6';
  clone.style.color = '#333';
  clone.style.background = '#ffffff';
  clone.style.visibility = 'visible';
  clone.style.pointerEvents = 'none';
};

// ============================================================
// 渲染每页可见内容（写入 .pdf-page-inner）
// translateY 裁切：第 i 页显示 [(i-1)*1123, i*1123] 区间
// ============================================================
const renderVisiblePages = async () => {
  if (!contentRef.value) return;
  await nextTick();

  const totalHeight = A4_HEIGHT_PX * pageCount.value;

  for (let i = 0; i < pageCount.value; i++) {
    const pageEl = pageRefs.value[i];
    if (!pageEl) continue;

    const clone = contentRef.value.cloneNode(true) as HTMLElement;
    clone.style.transform = `translateY(-${i * A4_HEIGHT_PX}px)`;
    applyCloneStyles(clone, totalHeight);

    pageEl.innerHTML = '';
    pageEl.appendChild(clone);
  }
};

// ============================================================
// ResizeObserver：容器宽高变化时重新分页
// ============================================================
let resizeObserver: ResizeObserver | null = null;

const setupResizeObserver = () => {
  const container = containerRef.value?.parentElement;
  if (!container || resizeObserver) return;

  resizeObserver = new ResizeObserver(() => {
    console.log('[PdfPageView ResizeObserver] 触发，重新计算分页');
    recalculate();
  });
  resizeObserver.observe(container);
};

// ============================================================
// 生命周期 & 监听
// ============================================================
onMounted(() => {
  console.log('[PdfPageView onMounted]', {
    contentLen: props.content?.length ?? 0,
    visible: props.visible,
  });
  renderContent();
  recalculate();
  setupResizeObserver();

  // 防御：如果 content 为空（简历数据尚未加载），等待 500ms 后重试
  if (!props.content?.trim()) {
    setTimeout(() => {
      if (props.content?.trim() && contentRef.value) {
        console.log('[PdfPageView] 延迟渲染：检测到内容已加载，重新渲染');
        renderContent();
        recalculate();
      }
    }, 500);
  }
});

onUnmounted(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
});

watch(() => props.content, () => {
  // contentRef 可能在 immediate:true 时还未赋值，延迟到下一帧确保 ref 已设置
  nextTick(() => {
    if (contentRef.value) {
      renderContent();
      recalculate();
    } else {
      // 极端情况：contentRef 仍未就绪，等待 100ms 后重试
      setTimeout(() => {
        renderContent();
        recalculate();
      }, 100);
    }
  });
}, { immediate: true });
watch(() => props.extraStyles, () => { renderContent(); recalculate(); });

defineExpose({ pageRefs, pageCount, recalculate, contentRef });
</script>

<style lang="scss" scoped>
/*
 * 布局说明：
 * .pdf-page-view        → 铺满父容器，display:flex 居中，overflow 交由外层 .preview-content 处理
 * .pdf-content-source   → visibility:hidden，width 包含 padding，用于精确测量 scrollHeight
 * .pdf-pages-container  → 固定宽度，白底，有阴影，内含 N 个 page-shell 垂直堆叠
 * .pdf-page-shell       → 固定高 1123px，overflow:hidden，内含 clone + 页码角标
 * .pdf-page-inner       → overflow:hidden，接收 clone 子节点
 *
 * 关键：.pdf-page-view 本身不设 overflow，
 *       滚动全由父容器 .preview-content { overflow:auto } 处理，
 *       避免内外双层滚动条导致的分页视觉混淆。
 */
.pdf-page-view {
  width: 100%;
  height: 100%;
  position: relative;
  overflow: visible; /* 不限制滚动，让父容器处理 */
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 0;
  background: #d0d0d0; /* 模拟桌面背景，保持中性灰色 */
  box-sizing: border-box;
}

.pdf-content-source {
  position: absolute;
  top: 0;
  left: 0;
  width: 794px;
  padding: 0; /* 内边距归零。内容边距完全由 .resume-document 的 padding: 40px（resume-markdown.css）统一管理 */
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-near-black);
  background: var(--color-white);
  visibility: hidden;
  pointer-events: none;
  /* height/overflow 由 JS 动态设置，初始同正常文档流 */
  height: auto;
  overflow: visible;
}

.pdf-pages-container {
  position: relative;
  margin: 0 auto;
  background: #c8c8c8; /* 灰缝底色，模拟纸张叠放间隙 */
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  width: 794px;
  /* 高度由 JS 动态设置 */
}

.pdf-page-shell {
  position: absolute;
  left: 0;
  overflow: hidden; /* 裁切 clone 超出部分 */
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); /* 每页独立阴影 */
}

/* 页间分割线：第 2 页起的顶部阴影，模拟纸张堆叠感 */
.page-break-indicator {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 12px;
  background: linear-gradient(
    to bottom,
    rgba(0, 0, 0, 0.18) 0%,
    rgba(0, 0, 0, 0.04) 60%,
    transparent 100%
  );
  pointer-events: none;
  z-index: 2;
}

/* 页码角标 */
.page-number {
  position: absolute;
  bottom: 12px;
  right: 16px;
  font-size: 10px;
  color: rgba(0, 0, 0, 0.35);
  font-family: var(--font-sans);
  pointer-events: none;
  z-index: 3;
  user-select: none;
}

.pdf-page-inner {
  position: absolute;
  top: 0;
  left: 0;
  overflow: hidden; /* 裁切 clone 内容 */
  padding: 0;
  box-sizing: border-box;
  font-size: 14px;
  line-height: 1.6;
  color: var(--color-near-black);
  background: var(--color-white);
  /* 注意：clone 内已有 padding:30px，这里不再设 padding */
}
</style>

<!-- 简历样式（全局，无 scoped） -->
<style lang="scss">
/* 断行规则：尽量保持块级元素不被从中截断 */
.pdf-page-view .resume-document {
  max-width: 100%;
  /* break-inside 避免分页时整块被切断 */
}

.pdf-page-view .section,
.pdf-page-view .subsection {
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
}

.pdf-page-view .table-wrapper,
.pdf-page-view table {
  break-inside: avoid;
  -webkit-column-break-inside: avoid;
  page-break-inside: avoid;
}

.pdf-page-view .resume-name { font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 12px; color: inherit; border: none !important; padding: 0 !important; }
.pdf-page-view .section-title, .pdf-page-view .subsection-title { font-size: 16px; font-weight: 600; border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 16px 0 10px; color: inherit; }
.pdf-page-view .item-list, .pdf-page-view .skills-list, .pdf-page-view .summary-list, .pdf-page-view .work-list, .pdf-page-view .project-list, .pdf-page-view .education-list, .pdf-page-view .custom-list { padding-left: 20px; margin: 0 0 10px; list-style: disc; }
.pdf-page-view .item { margin-bottom: 4px; }
.pdf-page-view .skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.pdf-page-view .skill-item { background: #f0f0f0; padding: 2px 10px; border-radius: 3px; font-size: 13px; margin: 0; }
.pdf-page-view .paragraph { margin: 0 0 8px; line-height: 1.6; }
.pdf-page-view .table-wrapper { overflow-x: auto; margin-bottom: 10px; }
.pdf-page-view .table { width: 100%; border-collapse: collapse; font-size: 13px; }
.pdf-page-view .table-cell { padding: 5px 8px; border: 1px solid #ddd; }
.pdf-page-view .table-row:nth-child(even) { background: #fafafa; }
.pdf-page-view .divider { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
.pdf-page-view .inline-code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
.pdf-page-view .link { color: #2563eb; text-decoration: none; }
.pdf-page-view .bold { font-weight: 700; }
.pdf-page-view .italic { font-style: italic; }
.pdf-page-view .strikethrough { text-decoration: line-through; }
.pdf-page-view .image-figure { text-align: center; margin: 10px 0; }
.pdf-page-view .image { max-width: 100%; height: auto; }
.pdf-page-view .image-caption { font-size: 12px; color: #666; margin-top: 4px; }
.pdf-page-view .blockquote { border-left: 3px solid #e0e0e0; padding-left: 12px; margin: 0 0 8px; color: #666; font-size: 13px; }
/* 主题颜色现已由 RESUME_CSS 设计令牌系统统一管理，不再在此处硬编码覆盖 */
</style>
