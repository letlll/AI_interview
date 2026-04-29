<template>
  <div class="resume-generator-new">
    <!-- 左侧模板选择栏 -->
    <TemplateSidebar
      v-model="selectedTemplate"
      @themeClassChange="handleThemeClassChange"
    />

    <!-- 主内容区 -->
    <div class="main-content" :style="{ marginLeft: sidebarWidth }">
      <!-- 顶部工具栏 -->
      <div class="top-toolbar">
        <h1 class="page-title">AI 简历生成器</h1>
        <div class="toolbar-actions">
          <!-- 简历编辑状态指示器 -->
          <el-tag v-if="isTemporary" type="warning" size="small">
            <el-icon class="is-loading"><Loading /></el-icon>
            编辑中（未保存）
          </el-tag>

          <el-divider direction="vertical" />

          <!-- 简历选择下拉菜单 -->
          <el-select
            v-model="currentResumeId"
            placeholder="选择简历"
            size="small"
            filterable
            @change="handleResumeChange"
            class="resume-selector"
            style="width: 200px; margin-right: 8px;"
          >
            <el-option
              v-for="resume in resumeList"
              :key="resume.id"
              :label="resume.title"
              :value="resume.id"
            >
              <div class="resume-option">
                <span class="resume-title">{{ resume.title }}</span>
                <span class="resume-status" :class="'status-' + resume.status">{{ resume.status === 'published' ? '已发布' : '草稿' }}</span>
              </div>
            </el-option>
          </el-select>
          <el-button size="small" @click="handleCreateNewResume" type="primary" plain>
            <el-icon><Plus /></el-icon>
            新建
          </el-button>

          <!-- 重命名按钮：仅在已选中简历时显示 -->
          <el-tooltip v-if="currentResumeId" content="重命名" placement="bottom">
            <el-button
              size="small"
              circle
              @click="handleRename"
              style="margin-left: 4px;"
            >
              <el-icon><EditPen /></el-icon>
            </el-button>
          </el-tooltip>

          <!-- 仅已发布简历显示"编辑"按钮 -->
          <el-button
            v-if="currentResume && currentResume.status === 'published'"
            size="small"
            type="warning"
            plain
            @click="handleEditPublished"
          >
            <el-icon><Edit /></el-icon>
            编辑
          </el-button>
          <!-- 保存和发布按钮 -->
          <el-button @click="handleSave" :disabled="!hasResumeData">
            <el-icon><DocumentCopy /></el-icon>
            保存
          </el-button>
          <el-button type="primary" @click="handlePublish" :disabled="!hasResumeData">
            <el-icon><Promotion /></el-icon>
            发布
          </el-button>
          <el-button @click="handleExport" :disabled="!hasResumeData">
            <el-icon><Download /></el-icon>
            导出 PDF
          </el-button>
        </div>
      </div>

      <!-- 导出 PDF 预览弹窗 -->
      <el-dialog
        v-model="pdfPreviewVisible"
        title="PDF 预览"
        width="680px"
        :close-on-click-modal="false"
        destroy-on-close
      >
        <div class="pdf-preview-container">
          <div v-if="pdfPreviewLoading" class="pdf-preview-loading">
            <el-icon class="is-loading" size="32"><Loading /></el-icon>
            <p>{{ pdfPreviewLoadingText }}</p>
          </div>

          <template v-else-if="pdfPreviewPages.length > 0">
            <div class="pdf-preview-info">
              <span class="quality-badge quality-badge--high">
                <el-icon><Select /></el-icon> Chromium 高质量导出
              </span>
              <span style="margin-left: 12px;">共 {{ pdfPreviewPages.length }} 页，确认后开始下载</span>
            </div>
            <div class="pdf-preview-pages">
              <div
                v-for="(img, index) in pdfPreviewPages"
                :key="index"
                class="pdf-preview-page"
              >
                <div class="pdf-preview-page-label">第 {{ index + 1 }} 页</div>
                <div class="pdf-preview-page-body">
                  <img :src="img" alt="简历预览" class="pdf-preview-img" />
                </div>
              </div>
            </div>
          </template>

          <div v-else class="pdf-preview-empty">
            <el-empty description="生成预览失败" />
          </div>
        </div>

        <template #footer>
          <el-button @click="pdfPreviewVisible = false">取消</el-button>
          <el-button
            type="primary"
            :disabled="pdfPreviewPages.length === 0"
            :loading="pdfDownloading"
            @click="confirmPdfDownload"
          >
            确认下载
          </el-button>
        </template>
      </el-dialog>

      <!-- 中间和右侧内容区 -->
      <div class="content-grid" :class="{ 'preview-collapsed': isPreviewCollapsed }">

        <!-- AI 对话模式 -->
        <template v-if="editMode === 'ai'">
          <div class="chat-section">
            <!-- 左侧面板模式切换菜单 -->
            <div class="section-header">
              <span class="section-title">{{ editModeLabel }}</span>
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <el-button text size="small" class="section-menu-btn">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <AIChatPanel
              ref="chatPanelRef"
              @message-sent="handleUserMessage"
            />
          </div>
        </template>

        <!-- Markdown 编辑模式 -->
        <template v-else-if="editMode === 'markdown'">
          <div class="markdown-section">
            <div class="section-header">
              <span class="section-title">{{ editModeLabel }}</span>
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <el-button text size="small" class="section-menu-btn">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="editor-header">
              <span>刷新预览</span>
              <el-button size="small" text @click="internalMarkdown = jsonToResumeMarkdown(resumeData)">
                刷新
              </el-button>
            </div>
            <el-input
              :model-value="markdownEditorValue"
              type="textarea"
              :rows="30"
              placeholder="用 Markdown 格式编写简历..."
              @input="handleMarkdownChange(String($event))"
              class="markdown-editor"
            />
          </div>
        </template>

        <!-- 源码模式 -->
        <template v-else-if="editMode === 'source'">
          <div class="source-section">
            <div class="section-header">
              <span class="section-title">{{ editModeLabel }}</span>
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <el-button text size="small" class="section-menu-btn">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <div class="editor-header">
              <span>JSON 源码</span>
              <el-button size="small" text @click="sourceCode = JSON.stringify(resumeData, null, 2)">
                刷新
              </el-button>
            </div>
            <el-input
              v-model="sourceCode"
              type="textarea"
              :rows="30"
              placeholder="JSON 格式"
              @blur="handleSourceCodeChange"
              class="source-editor"
            />
          </div>
        </template>

        <!-- 样式调整模式 -->
        <template v-else-if="editMode === 'style'">
          <div class="style-section">
            <div class="section-header">
              <span class="section-title">{{ editModeLabel }}</span>
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <el-button text size="small" class="section-menu-btn">
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
            <StyleAdjustmentPanel :extraStyles="extraStyles" @update:extraStyles="onExtraStylesUpdate" />
          </div>
        </template>

        <!-- 右侧：简历预览区 -->
        <div class="preview-section" v-show="!isPreviewCollapsed">
          <div class="preview-header">
            <el-dropdown trigger="click" @command="onRightDropdownCommand">
              <span class="preview-title-btn">
                {{ rightPanelModeLabel }}<el-icon class="el-icon--right"><CaretBottom /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="markdown" :class="{ 'is-active': rightPanelMode === 'markdown' }">
                    <el-icon v-if="rightPanelMode === 'markdown'"><Check /></el-icon>Markdown 预览
                  </el-dropdown-item>
                  <el-dropdown-item command="print" :class="{ 'is-active': rightPanelMode === 'print' }">
                    <el-icon v-if="rightPanelMode === 'print'"><Check /></el-icon>打印预览
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <div class="preview-content">
            <MarkdownRenderer
              v-if="rightPanelMode === 'markdown'"
              :content="internalMarkdown"
              :theme-class="resumeThemeClass"
              :extra-styles="extraStyles"
              @section-title-change="handleSectionTitleChange"
              @content-change="handleContentChange"
              @extra-styles-append="v => extraStyles += '\n' + v"
              ref="markdownRendererRef"
            />
            <PdfPageView
              v-else-if="rightPanelMode === 'print'"
              ref="pdfPageViewRef"
              :content="internalMarkdown"
              :theme-class="resumeThemeClass"
              :extra-styles="extraStyles"
              :visible="true"
              @pages-changed="onPagesChanged"
            />
          </div>
        </div>

        <!-- 收缩/展开按钮 -->
        <button class="collapse-toggle" @click="togglePreview" :title="isPreviewCollapsed ? '展开预览' : '收起预览'">
          <el-icon>
            <DArrowLeft v-if="!isPreviewCollapsed" />
            <DArrowRight v-else />
          </el-icon>
        </button>
      </div>
    </div>

    <!-- 样式调整面板（已改为内嵌模式，不再需要） -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted , nextTick } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
// In the script setup block, after line 330 (import useResumeAI):
import { useVersionHistory } from '@/composables/useVersionHistory';
import { DocumentCopy, Download, DArrowLeft, DArrowRight, Plus, Edit, Promotion, Loading, EditPen, MoreFilled, Check, CaretBottom, Select } from '@element-plus/icons-vue';
import TemplateSidebar from './ResumeGenerator/components/TemplateSidebar.vue';
import AIChatPanel from './ResumeGenerator/components/AIChatPanel.vue';
import StyleAdjustmentPanel from './ResumeGenerator/components/StyleAdjustmentPanel.vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';
import PdfPageView from '@/components/common/PdfPageView.vue';
import { createAIConversationApi, getAIMessagesApi, sendAIMessageApi, type AIResumeResponse } from '@/api/modules/resumeEditor';
import { createResumeApi, getResumeListApi , updateResumeApi } from '@/api/modules/resume';
import { useResumeAI, type ResumeData as AIResumeData, type Message, cleanInvalidKeys } from '@/composables/useResumeAI';
import { jsonToResumeMarkdown } from '@/utils/resumeMarkdown';
import { set } from 'lodash-es';
import { useExport } from '@/composables/useExport';
const chatPanelRef = ref<InstanceType<typeof AIChatPanel>>();
const selectedTemplate = ref('classic');
// 极简版：content 就是 internalMarkdown（完整 Markdown 字符串）
const resumeData = ref<AIResumeData>({
  content: ''
});
const sidebarWidth = ref('60px'); // 默认收起状态

// 初始化 AI 工具和版本管理
const { buildOptimizedPrompt, applyInstructions, detectIntent } = useResumeAI();
const { addVersion, getVersionDigest, revertTo, versions } = useVersionHistory();

// 对话持久化状态
const currentConversationId = ref<number | null>(null);
const chatHistory = ref<Message[]>([]);
const lastEditedField = ref<string>();
const isPreviewCollapsed = ref(false); // 默认显示预览
const editMode = ref<'ai' | 'markdown' | 'source' | 'style'>('ai');
// 右侧面板模式：'markdown' = Markdown 预览，'print' = 打印预览
const rightPanelMode = ref<'markdown' | 'print'>('markdown');

const leftModeOptions = [
  { label: 'AI 对话', value: 'ai' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'JSON 源码', value: 'source' },
  { label: '样式调整', value: 'style' },
];

const editModeLabel = computed(() => leftModeOptions.find(o => o.value === editMode.value)?.label ?? '');

const rightPanelModeLabel = computed(() =>
  rightPanelMode.value === 'markdown' ? 'Markdown 预览' : '打印预览'
);

// 左侧面板下拉菜单命令处理
const onLeftDropdownCommand = (cmd: string) => {
  switchEditMode(cmd);
};

// 右侧面板下拉菜单命令处理
const onRightDropdownCommand = (cmd: string) => {
  rightPanelMode.value = cmd as 'markdown' | 'print';
  console.log('[onRightDropdownCommand] 右侧预览模式切换为:', rightPanelMode.value);
};
const internalMarkdown = ref('');
const sourceCode = ref('');
const isAiLoading = ref(false); // AI 对话加载状态

// 简历列表相关状态
const resumeList = ref<any[]>([]);
const currentResumeId = ref<number | null>(null);
const exportTitle = computed(() => resumeList.value.find(r => r.id === currentResumeId.value)?.title || '未命名');

// 当前选中的简历对象（用于判断状态）
const currentResume = computed(() => {
  return resumeList.value.find(r => r.id === currentResumeId.value);
});

// 临时编辑状态（编辑已发布简历时使用）
const isTemporary = ref(false);
const tempId = ref<string | null>(null);

// 加载用户简历列表
const loadResumeList = async () => {
  try {
    const response = await getResumeListApi({ page_size: 50 });
    resumeList.value = response.results || [];
    console.log('简历列表加载成功:', resumeList.value.length);
  } catch (error) {
    console.error('加载简历列表失败:', error);
    resumeList.value = [];
  }
};

const extraStyles = ref('');       // 用户自定义 CSS 字符串
const markdownRendererRef = ref(); // MarkdownRenderer 实例
const pdfPageViewRef = ref();       // 右侧 PdfPageView 实例（A4 分页预览）

// PDF 预览相关状态
const pdfPreviewVisible = ref(false);
const pdfPreviewLoading = ref(false);
const pdfPreviewLoadingText = ref('正在生成预览...');
const pdfPreviewPages = ref<string[]>([]);
const pdfPreviewPdfBase64 = ref<string>('');
const pdfDownloading = ref(false);
const exportFallbackMode = ref(false);
const resumeThemeClass = ref('theme-blue');
const handleThemeClassChange = (themeClass: string) => {
  resumeThemeClass.value = themeClass;
};

/** 获取用于导出的渲染 HTML（兼容 Markdown 预览 / 打印预览） */
const getExportInnerHtml = (): string => {
  const unwrapMaybeRef = <T>(v: T | { value: T } | null | undefined): T | undefined => {
    if (v && typeof v === 'object' && 'value' in v) return (v as { value: T }).value;
    return v as T | undefined;
  };

  const markdownRoot = unwrapMaybeRef<HTMLElement | null>(markdownRendererRef.value?.markdownRoot) ?? undefined;
  const printContentRoot = unwrapMaybeRef<HTMLElement | null>(pdfPageViewRef.value?.contentRef) ?? undefined;

  if (rightPanelMode.value === 'markdown') {
    if (markdownRoot?.innerHTML?.trim()) return markdownRoot.innerHTML;
    if (printContentRoot?.innerHTML?.trim()) return printContentRoot.innerHTML;
  } else {
    if (printContentRoot?.innerHTML?.trim()) return printContentRoot.innerHTML;
    if (markdownRoot?.innerHTML?.trim()) return markdownRoot.innerHTML;
  }

  console.warn('[getExportInnerHtml] 无可用渲染内容', {
    rightPanelMode: rightPanelMode.value,
    hasMarkdownRoot: !!markdownRoot,
    hasPrintContentRoot: !!printContentRoot,
  });
  return '';
};

/**
 * 将 innerHTML 包装为完整的 HTML 文档（包含样式、字体、主题）。
 * 这是 Electron PDF 服务的核心缺失函数。
 */
const buildPdfHtmlDocument = (innerHtml: string, themeClass: string): string => {
  const resumeDocHtml = innerHtml.includes('resume-document')
    ? innerHtml
    : `<div class="resume-document ${themeClass}">${innerHtml}</div>`;

  const extraStylesBlock = extraStyles.value
    ? `<style id="pdf-extra-styles">${extraStyles.value}</style>`
    : '';

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      width: 794px;
      background: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.75;
      font-size: 16px;
      color: #333333;
    }
    .resume-document {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background: #ffffff;
    }
    .section { margin-bottom: 32px; padding: 16px 0; }
    .section:last-child { margin-bottom: 0; }
    .section-title {
      font-size: 16px; font-weight: 600;
      border-bottom: 1px solid #e0e0e0; padding-bottom: 4px; margin: 16px 0 10px;
    }
    .section-title.h1 { font-size: 32px; }
    .section-title.h2 { font-size: 18px; }
    .section-title.h3 { font-size: 16px; }
    .resume-name { font-size: 28px; font-weight: 700; text-align: center; margin: 0 0 12px; }
    .item-list, .skills-list, .summary-list, .work-list, .project-list, .education-list, .custom-list {
      padding-left: 20px; margin: 0 0 10px; list-style: disc;
    }
    .skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
    .skill-item { background: #f0f0f0; padding: 2px 10px; border-radius: 3px; font-size: 13px; }
    .paragraph { margin: 0 0 8px; }
    .table-wrapper { overflow-x: auto; margin-bottom: 10px; }
    .table { width: 100%; border-collapse: collapse; font-size: 13px; }
    .table-cell { padding: 5px 8px; border: 1px solid #ddd; }
    .table-row:nth-child(even) { background: #fafafa; }
    .divider { border: none; border-top: 1px solid #e0e0e0; margin: 12px 0; }
    .inline-code { background: #f5f5f5; padding: 1px 5px; border-radius: 3px; font-size: 13px; }
    .link { color: #2563eb; text-decoration: none; }
    .bold { font-weight: 700; }
    .italic { font-style: italic; }
    .strikethrough { text-decoration: line-through; }
    .image-figure { text-align: center; margin: 10px 0; }
    .image { max-width: 100%; height: auto; }
    .blockquote { border-left: 3px solid #e0e0e0; padding-left: 12px; margin: 0 0 8px; color: #666; font-size: 13px; }
    .section, .subsection, .table-wrapper, table { break-inside: avoid; }
    .work-item, .project-item, .education-item { margin-bottom: 12px; }
    .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 4px; }
    .item-title { font-weight: 600; }
    .item-date { font-size: 13px; color: #666; }
    .item-subtitle { font-size: 13px; color: #666; margin-bottom: 4px; }
    .work-list, .project-list, .education-list { list-style: none; padding-left: 0; }
    .work-item, .project-item, .education-item { padding-left: 0; }
    /* theme-blue */
    .theme-blue .resume-name { color: #1a56db; }
    .theme-blue .section-title { color: #1a56db; border-color: #bfdbfe; }
    .theme-blue .skill-item { background: #eff6ff; color: #1e40af; }
    /* theme-dark */
    .theme-dark { color: #f9fafb; background: #111827; }
    .theme-dark .resume-name { color: #58a6ff; }
    .theme-dark .section-title { color: #9ca3af; border-color: #374151; }
    .theme-dark .skill-item { background: #1f2937; color: #d1d5db; }
    /* theme-minimal */
    .theme-minimal .resume-name { color: #000; }
    .theme-minimal .section-title { color: #000; border-color: #000; }
    /* theme-classic */
    .theme-classic .resume-name { color: #1e3a5f; }
    .theme-classic .section-title { color: #1e3a5f; border-color: #c4d4e4; }
    .theme-classic .skill-item { background: #e8f0f8; color: #1e3a5f; }
    /* theme-modern */
    .theme-modern .resume-name { color: #6366f1; }
    .theme-modern .section-title { color: #6366f1; border-color: #c7d2fe; }
    .theme-modern .skill-item { background: #eef2ff; color: #4338ca; }
    .code-block { background: #f6f8fa; border-radius: 4px; padding: 12px; overflow-x: auto; font-size: 13px; }
    code { font-family: 'Consolas', 'Monaco', 'Courier New', monospace; }
  </style>
  ${extraStylesBlock}
</head>
<body>
  ${resumeDocHtml}
</body>
</html>`;
};

// 获取预览区域滚动容器
const getPreviewScrollContainer = (): HTMLElement | null => {
  const previewSection = document.querySelector('.preview-section');
  return previewSection?.querySelector('.preview-content') as HTMLElement | null;
};

// PdfPageView 分页数变化回调
const onPagesChanged = (count: number) => {
  console.log(`[PdfPageView] 当前共 ${count} 页`);
};

// 打开预览弹窗
const openPdfPreview = () => {
  if (!resumeData.value) {
    ElMessage.warning('暂无简历内容可导出');
    return;
  }
  pdfPreviewVisible.value = true;
  pdfPreviewLoading.value = true;
  pdfPreviewLoadingText.value = '正在生成预览...';
  pdfPreviewPages.value = [];
  pdfPreviewPdfBase64.value = '';
  exportFallbackMode.value = false;

  // 下一帧执行，给弹窗 DOM 渲染时间
  nextTick().then(() => {
    fetchPreview();
  });
};

const ELECTRON_PREVIEW_URL = 'http://localhost:9999/api/preview';

/** 通过 Electron /api/preview 生成预览（单次请求，返回预览图 + PDF blob） */
const fetchPreview = async () => {
  const innerHtml = getExportInnerHtml();
  if (!innerHtml) {
    ElMessage.warning('无法获取渲染内容，请先切换到 Markdown 或打印预览模式');
    pdfPreviewLoading.value = false;
    return;
  }

  pdfPreviewLoadingText.value = '正在通过 Chromium 生成高质量预览...';

  try {
    const html = buildPdfHtmlDocument(innerHtml, resumeThemeClass.value);
    const res = await fetch(ELECTRON_PREVIEW_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html,
        options: {
          resumeName: exportTitle.value,
          marginTop: 40,
          marginBottom: 40,
          marginLeft: 50,
          marginRight: 50,
          displayHeader: true,
        },
      }),
    });

    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try { const e = await res.json(); if (e.error) errMsg = e.error; } catch {}
      throw new Error(errMsg);
    }

    const result = await res.json();
    pdfPreviewPages.value = result.pageImages ?? [];
    pdfPreviewPdfBase64.value = result.pdfBase64 ?? '';
    pdfPreviewLoadingText.value = `生成完成，共 ${result.pageCount ?? 0} 页`;

  } catch (err: any) {
    console.warn('[fetchPreview] Electron 预览失败，切换到 html2canvas fallback:', err);
    exportFallbackMode.value = true;
    pdfPreviewLoadingText.value = '正在通过浏览器生成预览...';
    try {
      const el = rightPanelMode.value === 'print'
        ? (pdfPageViewRef.value as any)?.contentRef ?? null
        : (markdownRendererRef.value as any)?.markdownRoot ?? null;
      if (!el) throw new Error('预览组件未就绪');

      const unwrapMaybeRef = <T>(v: T | { value: T } | null | undefined): T | undefined => {
        if (v && typeof v === 'object' && 'value' in v) return (v as { value: T }).value;
        return v as T | undefined;
      };
      const elUnwrapped = unwrapMaybeRef<HTMLElement | null>(el);
      if (!elUnwrapped) throw new Error('预览组件元素未就绪');

      const { generatePdfBlob } = useExport(ref(elUnwrapped!), exportTitle.value);
      const data = await generatePdfBlob();
      if (data?.pageImages) {
        pdfPreviewPages.value = data.pageImages;
        pdfPreviewPdfBase64.value = '';
        pdfPreviewLoadingText.value = `生成完成，共 ${data.pageCount} 页`;
      } else {
        throw new Error('预览数据生成失败');
      }
    } catch (fallbackErr: any) {
      console.error('[fetchPreview] fallback 失败:', fallbackErr);
      ElMessage.error('预览生成失败：' + fallbackErr.message);
      pdfPreviewPages.value = [];
    } finally {
      pdfPreviewLoading.value = false;
    }
  }

// 确认下载（复用 /api/preview 返回的 PDF blob，或 fallback 模式直接调用 useExport）
const confirmPdfDownload = async () => {
  console.log('[confirmPdfDownload] 开始下载 PDF，fallback 模式:', exportFallbackMode.value);
  pdfDownloading.value = true;

  // fallback 模式：直接用 useExport 下载（Electron 不可用时）
  if (exportFallbackMode.value && !pdfPreviewPdfBase64.value) {
    try {
      const el = rightPanelMode.value === 'print'
        ? (pdfPageViewRef.value as any)?.contentRef ?? null
        : (markdownRendererRef.value as any)?.markdownRoot ?? null;

      const unwrapMaybeRef = <T>(v: T | { value: T } | null | undefined): T | undefined => {
        if (v && typeof v === 'object' && 'value' in v) return (v as { value: T }).value;
        return v as T | undefined;
      };
      const elUnwrapped = unwrapMaybeRef<HTMLElement | null>(el);
      if (!elUnwrapped) { ElMessage.error('导出目标未就绪'); return; }

      const { exportToPdf } = useExport(ref(elUnwrapped!), exportTitle.value);
      exportToPdf();
      pdfPreviewVisible.value = false;
      ElMessage.success('PDF 下载完成');
    } catch (err) {
      console.error('[confirmPdfDownload] fallback 下载失败:', err);
      ElMessage.error('PDF 下载失败');
    } finally {
      pdfDownloading.value = false;
    }
    return;
  }

  // Electron 路径：使用预览阶段生成的 PDF blob
  if (!pdfPreviewPdfBase64.value) { ElMessage.warning('PDF 数据为空，请重新生成预览'); pdfDownloading.value = false; return; }

  try {
    const binaryString = atob(pdfPreviewPdfBase64.value);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: 'application/pdf' });

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `简历-${exportTitle.value}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    pdfPreviewVisible.value = false;
    console.log('[confirmPdfDownload] PDF 下载完成');
    ElMessage.success('PDF 下载完成');
  } catch (err) {
    console.error('[confirmPdfDownload] 下载失败:', err);
    ElMessage.error('PDF 下载失败');
  } finally {
    pdfDownloading.value = false;
  }
};



// 获取简历数据（合并 extraStyles）
const getResumeDataToSave = () => ({
  ...resumeData.value,
  extraStyles: extraStyles.value
});

// 接收 StyleAdjustmentPanel 的样式更新
function onExtraStylesUpdate(v: string) {
  console.log('[onExtraStylesUpdate] 样式更新，长度:', v.length);
  extraStyles.value = v;
}

onMounted(() => {
  initConversation();
});

// 选择简历并加载对应的会话
const handleResumeChange = async (resumeId: number) => {
  if (!resumeId) return;

  // 如果当前有未保存的临时编辑，提示用户
  if (isTemporary.value) {
    const confirmed = await ElMessageBox.confirm(
      '当前有未保存的编辑，是否放弃？',
      '提示',
      { confirmButtonText: '放弃', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false);
    if (!confirmed) {
      // 恢复选择
      currentResumeId.value = tempId.value ? parseInt(tempId.value.replace('temp_', '')) : null;
      return;
    }
    // 清除临时状态
    isTemporary.value = false;
    tempId.value = null;
  }

  const selectedResume = resumeList.value.find(r => r.id === resumeId);
  if (!selectedResume) return;

  try {
    // 创建或获取绑定该简历的会话
    const conv = await createAIConversationApi(resumeId);
    currentConversationId.value = conv.id;

    // 加载简历内容
    const cleanedContent = cleanInvalidKeys(selectedResume.content_json || {});
    resumeData.value = { ...resumeData.value, ...cleanedContent };
    if (cleanedContent.content !== undefined) {
      internalMarkdown.value = cleanedContent.content;
    } else {
      internalMarkdown.value = cleanedContent.content || '';
    }
    // 恢复 extraStyles
    if (cleanedContent.extraStyles !== undefined) {
      extraStyles.value = cleanedContent.extraStyles || '';
    }

    // 加载消息历史
    await loadMessages(conv.id);

    ElMessage.success(`已加载简历: ${selectedResume.title}`);
  } catch (error) {
    console.error('加载简历会话失败:', error);
    ElMessage.error('加载简历失败');
  }
};

// 重命名简历
const handleRename = async () => {
  if (!currentResumeId.value) return;
  const target = resumeList.value.find(r => r.id === currentResumeId.value);
  const currentTitle = target?.title || '';

  console.log('[handleRename] 当前简历:', currentResumeId.value, currentTitle);

  const { value: newTitle } = await ElMessageBox.prompt(
    '请输入新的简历标题：',
    '重命名简历',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      inputValue: currentTitle,
    }
  ).catch(() => ({ value: null }));

  if (!newTitle || newTitle === currentTitle) return;

  console.log('[handleRename] 新标题:', newTitle);

  await updateResumeApi(currentResumeId.value, {
    title: newTitle,
    status: target?.status || 'draft',
    content_json: resumeData.value as any,
    template_name: selectedTemplate.value,
  });

  target!.title = newTitle;
  ElMessage.success('简历已重命名');
};

// 创建新简历
const handleCreateNewResume = async () => {
  console.log('[handleCreateNewResume] 开始创建新简历');

  try {
    // 弹出标题输入框
    const { value: userTitle } = await ElMessageBox.prompt(
      '请输入简历标题：',
      '新建简历',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        inputValue: `AI生成简历-${new Date().toLocaleDateString()}`,
      }
    ).catch(() => ({ value: null }));

    if (!userTitle) return;  // 用户取消

    const newResume = await createResumeApi({
      title: userTitle,      // ✅ 使用用户输入的标题
      status: 'draft',
      content_json: resumeData.value as any,
      template_name: selectedTemplate.value,
    });

    console.log('[handleCreateNewResume] 简历创建成功:', newResume.id, userTitle);

    // 创建新对话并绑定简历
    const newConv = await createAIConversationApi(newResume.id);
    currentConversationId.value = newConv.id;

    // 添加到列表并选中
    await loadResumeList();
    currentResumeId.value = newResume.id;
    console.log('[handleCreateNewResume] 已选中新简历:', newResume.id);

    // 清空聊天历史
    chatHistory.value = [];
    if (chatPanelRef.value) {
      chatPanelRef.value.setMessages([]);
    }

    ElMessage.success('已创建新简历');
    console.log('[handleCreateNewResume] 完成');
  } catch (error) {
    console.error('[handleCreateNewResume] 创建简历失败:', error);
    ElMessage.error('创建简历失败');
  }
};

// 编辑已发布简历（进入临时编辑模式）
const handleEditPublished = async () => {
  if (!currentResume.value || currentResume.value.status !== 'published') {
    return;
  }

  try {
    const confirmed = await ElMessageBox.confirm(
      '即将进入编辑模式。\n\n' +
      '• 原发布版本将保持不变\n' +
      '• 编辑完成后可选择「覆盖原版本」或「另存为新版本」\n\n' +
      '是否继续？',
      '编辑已发布简历',
      { confirmButtonText: '进入编辑', cancelButtonText: '取消', type: 'info' }
    ).catch(() => false);

    if (!confirmed) return;

    // 进入临时编辑模式
    isTemporary.value = true;
    tempId.value = `temp_${currentResumeId.value}_${Date.now()}`;

    ElMessage.info('已进入编辑模式，编辑完成后请保存');
  } catch (error) {
    console.error('进入编辑模式失败:', error);
    ElMessage.error('操作失败');
  }
};

// 初始化或加载对话会话
const initConversation = async () => {
  try {
    // 1. 先加载简历列表
    await loadResumeList();

    // 2. 如果有简历，默认选择最新的
    if (resumeList.value.length > 0) {
      const latestResume = resumeList.value[0]; // 已按 updated_at 排序
      currentResumeId.value = latestResume.id;
      await handleResumeChange(latestResume.id);
    }
    // 如果没有简历，显示空状态，用户可以点击"新建简历"
  } catch (error) {
    console.error('初始化对话会话失败:', error);
    // API 失败时使用本地模式
    currentConversationId.value = null;
  }
};

// 加载对话消息历史
const loadMessages = async (conversationId: number) => {
  try {
    const result = await getAIMessagesApi(conversationId);
        // 将服务器消息转换为本地格式
        chatHistory.value = result.messages.map(msg => {
      let role: 'user' | 'assistant' = 'user';
      try {
        const meta = typeof msg.metadata === 'string'
          ? JSON.parse(msg.metadata)
          : msg.metadata;
        if (meta?.is_ai_response === true) role = 'assistant';
      } catch {}
      return {
        role,
        content: msg.content,
        timestamp: new Date(msg.timestamp).getTime(),
      };
    });
    // 同步到 AIChatPanel
    if (chatPanelRef.value) {
      chatPanelRef.value.setMessages([...chatHistory.value]);
    }
  } catch (error) {
    console.error('加载消息历史失败:', error);
  }
};

// 获取当前用户 ID（需要根据实际的用户状态调整）
const getCurrentUserId = (): number => {
  // TODO: 根据实际的用户状态获取
  return 1;
};

// textarea 的独立值（与 internalMarkdown 解耦，防止 @input 时 computed 更新导致光标跳末）
const markdownEditorValue = ref('');

// 是否正在手动编辑 markdown（防止 watch 把用户输入覆盖掉）
const isMarkdownEditing = ref(false);

// ============================================================
// Markdown 编辑（无需元注释，直接使用 content 字段）
// ============================================================

// ============================================================
// 核心状态同步
// - resumeData.content 是 source of truth
// - internalMarkdown 由 watch(resumeData.content) 驱动，同步给 MarkdownRenderer
// - 外部来源（AI响应/源码编辑/AI对话）修改 resumeData.content → 自动触发 MarkdownRenderer 刷新
// - MarkdownRenderer 用户编辑 → handleContentChange 写回 resumeData.content → watch 驱动自身
// ============================================================

// resumeData.content 变化 → 同步 internalMarkdown（用于 MarkdownRenderer 渲染）
watch(
  () => resumeData.value?.content,
  (newContent) => {
    if (newContent !== undefined && newContent !== internalMarkdown.value) {
      internalMarkdown.value = newContent;
    }
  }
);

// 任意 resumeData 字段变化（含 content 原地赋值）→ 同步 JSON 源码面板
// 注意：必须用 deep: true，否则 resumeData.value.content = x 不会触发 shallow watch
watch(
  resumeData,
  (newData) => {
    if (newData && !isMarkdownEditing.value) {
      sourceCode.value = JSON.stringify(newData, null, 2);
    }
  },
  { deep: true }
);

// HTML 预览 / AI / JSON 等改写了 internalMarkdown 时，同步左侧 Markdown 文本框
// （与 handleMarkdownChange 解耦：正在输入时不覆盖，避免光标跳动）
watch(internalMarkdown, (md) => {
  if (!isMarkdownEditing.value && md !== markdownEditorValue.value) {
    markdownEditorValue.value = md;
  }
});

// chatHistory 变化时，同步到 AIChatPanel（仅在非交互状态下，如页面加载时）
watch(chatHistory, (newHistory) => {
  if (chatPanelRef.value && !isAiLoading.value) {
    chatPanelRef.value.setMessages([...newHistory]);
  }
}, { deep: true });

// 切换预览面板
const togglePreview = () => {
  isPreviewCollapsed.value = !isPreviewCollapsed.value;

  // 显示提示消息
  if (isPreviewCollapsed.value) {
    ElMessage.info('已隐藏预览面板');
  } else {
    ElMessage.success('已显示预览面板');
  }
};

// 切换编辑模式
const switchEditMode = (mode: string) => {
  console.log('[switchEditMode] 切换模式:', mode);
  editMode.value = mode as 'ai' | 'markdown' | 'source' | 'style';
  if (mode === 'source' && resumeData.value) {
    sourceCode.value = JSON.stringify(resumeData.value, null, 2);
  }
  if (mode === 'markdown' && !isMarkdownEditing.value) {
    markdownEditorValue.value = internalMarkdown.value;
  }
  // 切回 AI 模式时：v-if 会重建 AIChatPanel，watch 不会触发，手动同步历史
  if (mode === 'ai' && chatPanelRef.value) {
    chatPanelRef.value.setMessages([...chatHistory.value]);
  }
};

// Markdown 编辑器输入时：直接写入 internalMarkdown，同步 resumeData.content
let markdownDebounceTimer: number | null = null;
const handleMarkdownChange = (value: string) => {
  isMarkdownEditing.value = true;
  markdownEditorValue.value = value;
  if (markdownDebounceTimer) clearTimeout(markdownDebounceTimer);
  markdownDebounceTimer = setTimeout(() => {
    isMarkdownEditing.value = false;
    internalMarkdown.value = value;
    resumeData.value.content = value;
  }, 500) as unknown as number;
};

// MarkdownRenderer 内容变化 → 同步更新
const handleContentChange = (markdown: string) => {
  internalMarkdown.value = markdown;
  resumeData.value.content = markdown;
};

const handleSectionTitleChange = (payload: { oldTitle: string; newTitle: string; sectionType: string }) => {
  const { oldTitle, newTitle } = payload;
  if (!oldTitle || !newTitle || oldTitle === newTitle) return;

  // 替换 ## oldTitle → ## newTitle
  internalMarkdown.value = internalMarkdown.value.replace(
    new RegExp(`^## ${escapeRegExp(oldTitle)}$`, 'm'),
    `## ${newTitle}`
  );
  resumeData.value.content = internalMarkdown.value;
};

// 安全转义正则特殊字符
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 源码编辑变化（直接解析，content 字段存完整 markdown）
const handleSourceCodeChange = () => {
  console.log('[handleSourceCodeChange] 源码编辑变化');
  try {
    const parsed = JSON.parse(sourceCode.value);
    resumeData.value = parsed;
    // content 可能为 ''，不能用 if (parsed.content) 判断
    if (parsed.content !== undefined) {
      internalMarkdown.value = parsed.content;
    }
    ElMessage.success('已更新');
    console.log('[handleSourceCodeChange] JSON 解析成功');
  } catch (e) {
    console.error('[handleSourceCodeChange] JSON 格式错误:', e);
    ElMessage.error('JSON 格式错误');
  }
};

const hasResumeData = computed(() => {
  return resumeData.value && Object.keys(resumeData.value).length > 0;
});

// 处理用户发送的消息
const handleUserMessage = async (message: string) => {
  if (!chatPanelRef.value) return;

  // 先构建 prompt，再 push 历史（避免当前消息出现在历史中）
  chatPanelRef.value.setLoading(true);

  try {
    // 【核心修复】确保有有效的 conversation，再发送消息
    if (!currentConversationId.value || !currentResumeId.value) {
      throw new Error('请先选择或创建一个简历，再发送消息');
    }

    // 构建优化后的 Prompt
    const optimizedPrompt = buildOptimizedPrompt(
      message,
      resumeData.value,
      chatHistory.value,
      lastEditedField.value,
      internalMarkdown.value,
      extraStyles.value        // ← 新增
    );

    console.log('优化后的 Prompt:', optimizedPrompt);
    console.log('Token 估算:', Math.ceil(optimizedPrompt.length / 4));

    // 调用 conversation API，既获取 AI 回复，又自动保存消息到数据库
    const response = await sendAIMessageApi(
      currentConversationId.value,
      message,
      lastEditedField.value,
      optimizedPrompt
    );
    
    // ══════════════════════════════════════════════════════
    // 样式指令处理（必须在 addAssistantMessage 之前）
    // ══════════════════════════════════════════════════════
    const directMatch = message.match(/^styles?\s*[:：]\s*([\s\S]+)$/i);
    if (directMatch) {
      extraStyles.value = directMatch[1].trim();  // 改为直接赋值
      chatPanelRef.value.addAssistantMessage('样式已更新，请查看效果。');
      chatPanelRef.value.setLoading(false);
      return;
    }

    const aiStyleMatch = response.message.match(/\/\* style:([\s\S]*?)\*\//);
    if (aiStyleMatch) {
      extraStyles.value = aiStyleMatch[1].trim();  // 改为直接赋值
      response.message = response.message.replace(/\/\* style:[\s\S]*?\*\//g, '').trim();
    }


    // 应用更新指令
    if (response.instructions && response.instructions.length > 0) {
      console.log('收到更新指令:', response.instructions);
      console.log('当前简历数据:', resumeData.value);

      const newData = applyInstructions(resumeData.value, response.instructions);
      resumeData.value = newData;
      if (newData.content) internalMarkdown.value = newData.content;
      // 同步 extraStyles（AI 可能通过 instructions 修改了样式）
      if (newData.extraStyles !== undefined) {
        extraStyles.value = newData.extraStyles;
      }
      // 保存版本
      const intent = detectIntent(message, lastEditedField.value);
      addVersion(resumeData.value, response.message, response.instructions, intent);

      console.log('最终简历数据:', resumeData.value);
    }

    // 将用户消息追加到历史
    chatHistory.value.push({
      role: 'user',
      content: message,
      timestamp: Date.now()
    });

    // 添加 AI 回复到历史
    const aiMessage: Message = {
      role: 'assistant',
      content: response.message,
      timestamp: Date.now()
    };
    chatHistory.value.push(aiMessage);

    // 显示 AI 回复
    chatPanelRef.value.addAssistantMessage(response.message);

    // 保持对话历史在 10 轮以内
    if (chatHistory.value.length > 20) {
      chatHistory.value = chatHistory.value.slice(-20);
    }
  } catch (error) {
    console.error('AI 生成失败:', error);
    chatPanelRef.value.addAssistantMessage('抱歉，生成过程中出现了错误，请重试。');
    ElMessage.error('AI 生成失败');
  } finally {
    chatPanelRef.value.setLoading(false);
  }
  
};

// 处理字段编辑（仅更新 basicInfo / summary，主体内容走 content）
const handleFieldChange = (path: string, value: string | any) => {
  lastEditedField.value = path;
  console.log(`字段修改: ${path} = ${value}`);

  if (!resumeData.value) return;

  // 源码编辑模式：整份替换
  if (!path && value && typeof value === 'object') {
    resumeData.value = value;
    if (value.content) internalMarkdown.value = value.content;
    addVersion(resumeData.value, '源码编辑更新', []);
    return;
  }

  // 单字段更新
  if (path) {
    set(resumeData.value, path, value);
    addVersion(
      resumeData.value,
      `手动修改 ${path}`,
      [{ action: 'update', path, value }]
    );
  }
};

// 调用真实的 AI API 生成简历
const generateResumeFromChat = async (
  message: string,
  optimizedPrompt: string
): Promise<AIResumeResponse> => {
  try {
    // 准备聊天历史（只发送最近 10 轮对话）
    const recentHistory = chatHistory.value.slice(-20).map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    // 调用真实的 AI API
    const response = await generateResumeFromChatApi(
      message,
      resumeData.value,
      recentHistory,
      lastEditedField.value,
      optimizedPrompt
    );

    return response;
  } catch (error) {
    console.error('AI API 调用失败:', error);
    
    // 临时使用模拟数据，让页面能正常工作
    console.warn('使用模拟数据进行测试');
    
    // 检测用户意图并返回模拟数据
    if (message.includes('生成') || message.includes('创建') || message.includes('帮我')) {
      return {
        instructions: [
          {
            action: 'update',
            path: 'basicInfo',
            value: {
              name: '张三',
              phone: '13800138000',
              email: 'zhangsan@example.com',
              location: '北京'
            },
            reason: '初始化基本信息'
          },
          {
            action: 'update',
            path: 'content',
            value: `## 工作经历

- **字节跳动** | 2021.06 - 至今
  - 负责公司核心产品的前端开发工作，使用 Vue3 + TypeScript 技术栈
  - 参与系统架构设计，制定前端开发规范和最佳实践
  - 优化页面性能，首屏加载时间从 3.2s 降低到 1.5s

## 项目经验

- **企业管理系统前端重构** | 2023.03 - 2023.08
  - 主导前端架构升级，从 Vue2 迁移到 Vue3
  - 引入 TypeScript 和 Pinia 状态管理，复用率提升 60%

## 教育背景

- **某某大学** | 2017.09 - 2021.06
  - 计算机科学与技术 | 本科`
            ,
            reason: '添加简历主体内容'
          }
        ],
        message: '✅ 已为你生成简历框架！\n\n包含：\n• 基本信息\n• 工作经历\n• 项目经验\n• 教育背景\n\n你可以继续对话修改任意内容，或直接在 Markdown 编辑器中编辑。'
      };
    }
    
    // 默认返回友好提示
    return {
      instructions: [],
      message: '⚠️ AI 服务暂时不可用（后端接口 404）\n\n请检查：\n1. 后端服务是否正在运行\n2. 是否已重启后端加载新代码\n3. URL 路由是否正确配置\n\n当前使用模拟数据进行测试。'
    };
  }
};

// 保存简历
const handleSave = async () => {
  if (!resumeData.value) {
    ElMessage.warning('暂无简历内容可保存');
    return;
  }

  try {
    const title = `简历-${currentResume.value?.title?.replace(/^简历-/, '') || '未命名'}`;

    // 如果是临时编辑模式（编辑已发布简历），弹出保存方式选择
    if (isTemporary.value) {
      const action = await ElMessageBox.confirm(
        '请选择保存方式：',
        '保存简历',
        {
          confirmButtonText: '覆盖原版本',
          cancelButtonText: '另存为新版本',
          distinguishCancelAndClose: true,
          type: 'info'
        }
      ).catch((action: any) => action);

      // 如果用户点击了 X 关闭，action 为 'cancel'
      // 用户选择"覆盖原版本"则继续执行，选择"另存为新版本"则走 else 分支
      if (action === 'cancel') {
        // 另存为新版本（状态为 draft）
        const newResume = await createResumeApi({
          title: `${title} (副本)`,
          status: 'draft',
          content_json: getResumeDataToSave(),
          template_name: selectedTemplate.value,
        } as any);

        // 创建新对话并绑定简历
        const newConv = await createAIConversationApi(newResume.id);
        currentConversationId.value = newConv.id;

        // 添加到列表并选中
        await loadResumeList();
        currentResumeId.value = newResume.id;

        // 清除临时状态
        isTemporary.value = false;
        tempId.value = null;

        ElMessage.success('已另存为新版本');
        return;
      }

      // 覆盖原版本（保持 published 状态）
      await updateResumeApi(currentResumeId.value!, {
        title: title,
        status: 'published',
        content_json: getResumeDataToSave() as any,
        template_name: selectedTemplate.value,
      });

      // 更新列表中的该简历内容
      const targetResume = resumeList.value.find(r => r.id === currentResumeId.value);
      if (targetResume) {
        targetResume.content_json = getResumeDataToSave();
        targetResume.status = 'published';
      }

      // 清除临时状态
      isTemporary.value = false;
      tempId.value = null;

      ElMessage.success('已覆盖原版本');
      return;
    }

    // handleSave 中的普通保存逻辑
    if (currentResumeId.value) {
      const target = resumeList.value.find(r => r.id === currentResumeId.value);
      await updateResumeApi(currentResumeId.value, {
        title: target?.title,
        status: target?.status || 'draft',
        content_json: getResumeDataToSave() as any,
        template_name: selectedTemplate.value,
      });
      if (target) {
        target.content_json = getResumeDataToSave();
      }
      ElMessage.success('已更新');
    } else {
      // 无简历 → 新建草稿（先让用户输入标题）
      const { value: userTitle } = await ElMessageBox.prompt(
        '请输入简历标题：',
        '新建简历',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          inputValue: title,  // 预填自动生成的标题
        }
      ).catch(() => ({ value: null }));

      if (!userTitle) return;  // 用户取消

      const newResume = await createResumeApi({
        title: userTitle,      // ✅ 使用用户输入的标题
        status: 'draft',
        content_json: getResumeDataToSave(),
        template_name: selectedTemplate.value,
      } as any);

      // 创建新对话并绑定简历
      const newConv = await createAIConversationApi(newResume.id);
      currentConversationId.value = newConv.id;

      // 添加到列表并选中
      await loadResumeList();
      currentResumeId.value = newResume.id;

      ElMessage.success('已保存为草稿');
    }
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存简历失败');
  }
};

// 发布简历
const handlePublish = async () => {
  if (!resumeData.value) {
    ElMessage.warning('暂无简历内容可发布');
    return;
  }

  try {
    const confirmed = await ElMessageBox.confirm(
      '发布后简历将正式上线，确定要发布吗？',
      '确认发布',
      { confirmButtonText: '确定发布', cancelButtonText: '取消', type: 'warning' }
    ).catch(() => false);

    if (!confirmed) return;

    if (currentResumeId.value) {
      await updateResumeApi(currentResumeId.value!, {
        title: currentResume.value?.title,
        status: 'published',
        content_json: resumeData.value as any,
        template_name: selectedTemplate.value,
      });

      const target = resumeList.value.find(r => r.id === currentResumeId.value);
      if (target) {
        target.status = 'published';
        target.content_json = resumeData.value;
      }

      ElMessage.success('简历已发布！');
    } else {
      const newResume = await createResumeApi({
        title: currentResume.value?.title || '未命名简历',
        status: 'published',
        content_json: resumeData.value,
        template_name: selectedTemplate.value,
      } as any);

      const newConv = await createAIConversationApi(newResume.id);
      currentConversationId.value = newConv.id;

      await loadResumeList();
      currentResumeId.value = newResume.id;

      ElMessage.success('简历已创建并发布！');
    }
  } catch (error) {
    console.error('发布失败:', error);
    ElMessage.error('发布简历失败');
  }
};

// 导出简历（PDF）
// 导出按钮打开预览弹窗
const handleExport = () => {
  openPdfPreview();
};




</script>

<style scoped lang="scss">
.resume-generator-new {
  position: relative;
  height: calc(100vh - 60px);
  background: var(--el-bg-color-page);
}

.main-content {
  display: flex;
  flex-direction: column;
  height: 100%;
  transition: margin-left 0.3s ease;
}

.top-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0;
}

.toolbar-actions {
  display: flex;
  align-items: center;
  gap: 12px;

  .el-divider {
    height: 24px;
    margin: 0;
  }
}

// 简历选择下拉菜单样式
.resume-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;

  .resume-title {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .resume-status {
    font-size: 12px;
    padding: 2px 8px;
    border-radius: 4px;
    margin-left: 8px;

    &.status-draft {
      background: #e6f7ff;
      color: #1890ff;
    }

    &.status-published {
      background: #f6ffed;
      color: #52c41a;
    }
  }
}

.content-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0;
  overflow: hidden;
  min-height: 0; // 关键：允许子元素收缩
  position: relative;
  transition: grid-template-columns 0.3s ease;
  
  &.preview-collapsed {
    grid-template-columns: 1fr 0;
  }
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-fill-color-light);
  flex-shrink: 0;

  .section-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }

  .section-menu-btn {
    padding: 4px;
    font-size: 16px;
    color: var(--el-text-color-secondary);

    &:hover {
      color: var(--el-color-primary);
    }
  }
}

.chat-section,
.markdown-section,
.source-section,
.style-section,
.print-section,
.preview-section {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color);

  &:last-child {
    border-right: none;
  }
}

// 打印预览区域：滚动由内层 .preview-content { overflow:auto } 统一处理
// 不在此设 overflow，避免双层滚动条导致的分页视觉混淆
.print-section {
  overflow: hidden;
}

// Markdown、源码、样式编辑器样式
.markdown-section,
.source-section,
.style-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);

  .editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color);
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .markdown-editor,
  .source-editor {
    flex: 1;
    height: 100%;

    :deep(.el-textarea__inner) {
      height: 100%;
      resize: none;
      font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
      font-size: 14px;
      line-height: 1.6;
      padding: 16px;
      border: none;
      border-radius: 0;
      background: #1e1e1e;
      color: #d4d4d4;
    }
  }
}

.source-editor {
  :deep(.el-textarea__inner) {
    background: #f5f5f5;
    color: #333;
  }
}

// 预览区样式
.preview-section {
  display: flex;
  flex-direction: column;
  background: var(--el-bg-color);

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 12px 16px;
    border-bottom: 1px solid var(--el-border-color);
    font-weight: 500;
    color: var(--el-text-color-primary);
  }

  .preview-title-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    color: var(--el-text-color-primary);
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.2s;

    &:hover {
      background: var(--el-fill-color-light);
    }
  }

  .preview-content {
    flex: 1;
    overflow: auto;
    padding: 0;           
    background: #c8c8c8;
  }
}

.collapse-toggle {
  position: absolute;
  right: 0;
  top: 50%;
  transform: translateY(-50%);
  z-index: 10;
  width: 32px;
  height: 64px;
  background: var(--el-bg-color);
  border: 1px solid var(--el-border-color);
  border-right: none;
  border-radius: 4px 0 0 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--el-text-color-regular);
  transition: all 0.3s ease;
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.05);
  
  &:hover {
    background: var(--el-fill-color-light);
    color: var(--el-color-primary);
    width: 36px;
  }
  
  .preview-collapsed & {
    right: -32px;
    border-radius: 0 4px 4px 0;
    border-right: 1px solid var(--el-border-color);
    border-left: none;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);
  }
}

// 响应式布局
@media (max-width: 1280px) {
  .content-grid {
    grid-template-columns: 45% 55%;
    
    &.preview-collapsed {
      grid-template-columns: 1fr 0;
    }
  }
}

@media (max-width: 768px) {
  .content-grid {
    grid-template-columns: 1fr;
    
    &.preview-collapsed {
      grid-template-columns: 1fr;
    }
  }
  
  .preview-section {
    position: fixed;
    top: 0;
    right: 0;
    width: 100%;
    height: 100vh;
    z-index: 1000;
    background: var(--el-bg-color);
  }
  
  .collapse-toggle {
    width: 48px;
    height: 48px;
    border-radius: 50%;
    bottom: 24px;
    top: auto;
    right: 24px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    
    &:hover {
      width: 48px;
      transform: scale(1.1);
    }
    
    .preview-collapsed & {
      right: 24px;
      border-radius: 50%;
    }
  }
  
  .top-toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }
}

/* PDF 预览弹窗：高分辨率截图需限制尺寸，避免 flex 子项按固有像素撑破弹窗 */
.pdf-preview-container {
  max-height: 70vh;
  overflow-y: auto;
  min-width: 0;
  box-sizing: border-box;
}
.pdf-preview-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: var(--el-text-color-secondary);
}
.pdf-preview-loading p {
  margin-top: 12px;
}
.pdf-preview-info {
  margin-bottom: 16px;
  color: var(--el-text-color-secondary);
  font-size: 13px;
}
.pdf-preview-pages {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
  max-width: 100%;
}
.pdf-preview-page {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
  min-width: 0;
  max-width: 100%;
}
.pdf-preview-page-label {
  padding: 6px 12px;
  background: var(--el-fill-color-light);
  font-size: 12px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);
}
.pdf-preview-page-body {
  min-width: 0;
  max-height: min(72vh, 900px);
  overflow: auto;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding: 12px;
  background: var(--el-fill-color-lighter);
  box-sizing: border-box;
}
.pdf-preview-img {
  display: block;
  max-width: 100%;
  max-height: min(68vh, 880px);
  width: auto;
  height: auto;
  object-fit: contain;
  /* 纸张外轮廓：阴影 + 白色背景 + 圆角 */
  background: #ffffff;
  border-radius: 4px;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.07),
    0 10px 20px rgba(0, 0, 0, 0.06),
    0 0 0 1px rgba(0, 0, 0, 0.06);
}
.pdf-preview-empty {
  padding: 40px 0;
}
</style>
