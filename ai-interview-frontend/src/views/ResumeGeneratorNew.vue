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
                     <!-- 简历编辑状态指示器 -->
          <el-tag v-if="isTemporary" type="default" size="small">
            <el-icon class="is-loading"><Loading /></el-icon>
            编辑中
          </el-tag>
          <el-button @click="handleSave" :disabled="!hasResumeData">
            <el-icon><DocumentCopy /></el-icon>
            保存
          </el-button>
          <el-button type="primary" @click="handlePublish" :disabled="!hasResumeData">
            <el-icon><Promotion /></el-icon>
            发布
          </el-button>·
                  <el-button
                    type="primary"
                    size="default"
                    @click="handleDownloadPdf"
                  >
                    <el-icon><Download /></el-icon>
                    下载 PDF
                  </el-button>

        </div>
      </div>

      <!-- 中间和右侧内容区 -->
      <div class="content-grid" :class="{ 'preview-collapsed': isPreviewCollapsed }">

        <!-- AI 对话模式 -->
        <template v-if="editMode === 'ai'">
          <div class="chat-section">
            <!-- 左侧面板模式切换菜单（已改为和右侧完全相同的样式） -->
            <div class="section-header preview-header">
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <span class="preview-title-btn">
                  {{ editModeLabel }}<el-icon class="el-icon--right"><CaretBottom /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <el-button size="small" @click="handleRefreshChat" style="margin-left: 8px;">
                刷新
              </el-button>
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
            <!-- 把刷新按钮合并到header里，和下拉菜单同一行，去掉额外的editor-header -->
            <div class="section-header preview-header">
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <span class="preview-title-btn">
                  {{ editModeLabel }}<el-icon class="el-icon--right"><CaretBottom /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
              <!-- 刷新按钮放到header右侧，和右侧的刷新按钮位置完全对应 -->
              <el-button size="small" @click="internalMarkdown = jsonToResumeMarkdown(resumeData)" style="margin-left: 8px;">
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
            <!-- 同样合并刷新按钮到header里，去掉editor-header -->
            <div class="section-header preview-header">
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <span class="preview-title-btn">
                  {{ editModeLabel }}<el-icon class="el-icon--right"><CaretBottom /></el-icon>
                </span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-for="item in leftModeOptions" :key="item.value" :command="item.value" :class="{ 'is-active': editMode === item.value }">
                      <el-icon v-if="editMode === item.value"><Check /></el-icon>{{ item.label }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
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
            <div class="section-header preview-header">
              <el-dropdown trigger="click" @command="onLeftDropdownCommand">
                <span class="preview-title-btn">
                  {{ editModeLabel }}<el-icon class="el-icon--right"><CaretBottom /></el-icon>
                </span>
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
                  <el-dropdown-item command="electron" :class="{ 'is-active': rightPanelMode === 'electron' }">
                    <el-icon v-if="rightPanelMode === 'electron'"><Check /></el-icon>精确预览
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
            <!-- 精确预览刷新按钮 -->
            <el-button
              v-if="rightPanelMode === 'electron'"
              size="small"
              :loading="electronPreviewLoading"
              @click="handleRefreshElectronPreview"
              style="margin-left: 8px;"
            >
              刷新
            </el-button>
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
            <!-- 精确预览：Electron API，Chromium 渲染 + 精确分页 + PDF 导出 -->
            <div v-else-if="rightPanelMode === 'electron'" class="electron-preview-container">
              <!-- 加载状态 -->
              <div v-if="electronPreviewLoading" class="pdf-preview-loading">
                <el-icon class="is-loading" size="32"><Loading /></el-icon>
                <p>{{ electronPreviewLoadingText }}</p>
              </div>

              <!-- 错误状态 -->
              <div v-else-if="electronPreviewError" class="pdf-preview-error">
                <el-icon size="32" color="#f56c6c"><CircleCloseFilled /></el-icon>
                <p>{{ electronPreviewError }}</p>
                <el-button size="small" @click="handleRefreshElectronPreview">重试</el-button>
              </div>

              <!-- 精确预览结果 -->
              <div v-else-if="electronPreviewResult" class="electron-preview-content">
                <div class="pdf-preview-info">
                  共 {{ pdfPageCount }} 页{{ electronPreviewMeta ? ' · ' + electronPreviewMeta : '' }}
                </div>
                <div class="pdf-preview-pages">
                  <div
                    v-for="pageNum in pdfPageCount"
                    :key="pageNum"
                    class="pdf-preview-page"
                  >
                    <div class="pdf-preview-page-label">第 {{ pageNum }} / {{ pdfPageCount }} 页</div>
                    <div :ref="el => setPdfPageContainer(pageNum, el)" class="pdf-preview-page-body" />
                  </div>
                </div>
              </div>

              <!-- 空状态 -->
              <div v-else class="pdf-preview-empty">
                <el-icon size="48" color="#c0c4cc"><Document /></el-icon>
                <p>点击右上角「刷新」按钮生成精确预览</p>
              </div>
            </div>
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
import { DocumentCopy, Download, DArrowLeft, DArrowRight, Plus, Edit, Promotion, Loading, EditPen, MoreFilled, Check, CaretBottom, CircleCloseFilled, Document } from '@element-plus/icons-vue';
import TemplateSidebar from './ResumeGenerator/components/TemplateSidebar.vue';
import AIChatPanel from './ResumeGenerator/components/AIChatPanel.vue';
import StyleAdjustmentPanel from './ResumeGenerator/components/StyleAdjustmentPanel.vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';
import PdfPageView from '@/components/common/PdfPageView.vue';
import { createAIConversationApi, getAIMessagesApi, sendAIMessageApi, generateResumeFromChatApi, type AIResumeResponse } from '@/api/modules/resumeEditor';
import { createResumeApi, getResumeListApi , updateResumeApi, updateResumeFileApi } from '@/api/modules/resume';
import { useResumeAI, type ResumeData as AIResumeData, type Message, cleanInvalidKeys } from '@/composables/useResumeAI';
import { jsonToResumeMarkdown } from '@/utils/resumeMarkdown';
import { set } from 'lodash-es';
import { usePdfRenderer } from '@/composables/usePdfRenderer';
import { Marked } from 'marked';                        // ← 新增：Marked 类
import { markedHighlight } from 'marked-highlight';     // ← 新增：代码高亮插件
import hljs from 'highlight.js';                         // ← 新增：highlight.js
import { RESUME_CSS } from '@/styles/resumeMarkdownCss';
import { autoDetectSectionType } from '@/composables/useResumeRenderer';
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
// 右侧面板模式：'markdown' = Markdown 预览，'print' = 打印预览，'electron' = 精确预览
const rightPanelMode = ref<'markdown' | 'print' | 'electron'>('markdown');

// 精确预览相关状态
const electronPreviewLoading = ref(false);
const electronPreviewLoadingText = ref('正在生成精确预览...');
const electronPreviewResult = ref<{
  pageCount: number;
  pdfBase64: string;
} | null>(null);
const electronPreviewMeta = ref('');
const electronPreviewError = ref('');

// PDF.js 渲染：监听 electronPreviewResult.pdfBase64 变化，逐页渲染 canvas
const pdfBase64Source = computed(() => electronPreviewResult.value?.pdfBase64 ?? null);
const { pages: pdfPages, pageCount: pdfPageCount } = usePdfRenderer({
  pdfBase64: pdfBase64Source,
  scale: 2,
});

const pdfPageContainers = ref<Record<number, HTMLElement>>({});
const setPdfPageContainer = (pageNum: number, el: any) => {
  if (el) pdfPageContainers.value[pageNum] = el as HTMLElement;
  else delete pdfPageContainers.value[pageNum];
};

// 当 PDF.js 渲染出新页面时，追加 canvas 到对应容器
watch(pdfPages, async (newPages) => {
  await nextTick();
  for (const page of newPages) {
    const container = pdfPageContainers.value[page.pageNum];
    if (container && !container.contains(page.canvas)) {
      container.innerHTML = '';
      container.appendChild(page.canvas);
      page.canvas.style.width = '100%';
      page.canvas.style.height = 'auto';
    }
  }
}, { deep: true });

const leftModeOptions = [
  { label: 'AI 对话', value: 'ai' },
  { label: 'Markdown', value: 'markdown' },
  { label: 'JSON 源码', value: 'source' },
  { label: '样式调整', value: 'style' },
];

const editModeLabel = computed(() => leftModeOptions.find(o => o.value === editMode.value)?.label ?? '');

const rightPanelModeLabel = computed(() =>
  rightPanelMode.value === 'markdown' ? 'Markdown 预览' :
  rightPanelMode.value === 'print' ? '打印预览' : '精确预览'
);

// 左侧面板下拉菜单命令处理
const onLeftDropdownCommand = (cmd: string) => {
  switchEditMode(cmd);
};

// 右侧面板下拉菜单命令处理
const onRightDropdownCommand = (cmd: string) => {
  rightPanelMode.value = cmd as 'markdown' | 'print' | 'electron';
  console.log('[onRightDropdownCommand] 右侧预览模式切换为:', rightPanelMode.value);
};
const internalMarkdown = ref('');
const sourceCode = ref('');
const isAiLoading = ref(false); // AI 对话加载状态

// 简历列表相关状态
const resumeList = ref<any[]>([]);
const currentResumeId = ref<number | null>(null);
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
const resumeThemeClass = ref('theme-blue');
const handleThemeClassChange = (themeClass: string) => {
  resumeThemeClass.value = themeClass;
};
// PdfPageView 分页数变化回调
const onPagesChanged = (count: number) => {
  console.log(`[PdfPageView] 当前共 ${count} 页`);
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

    // 有内容时标记为未保存状态
    if (cleanedContent && Object.keys(cleanedContent).length > 0) {
      isTemporary.value = true;
      tempId.value = `temp_${resumeId}_${Date.now()}`;
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

// 内容大范围变化（如 AI 生成完成）时，自动刷新精确预览
let electronDebounceTimer: ReturnType<typeof setTimeout> | null = null;
watch(internalMarkdown, (val, oldVal) => {
  // 只有当变化超过 500 字符时才触发（避免每次 keystroke 都调用）
  if (Math.abs((val || '').length - (oldVal || '').length) > 500) {
    if (electronDebounceTimer) clearTimeout(electronDebounceTimer);
    electronDebounceTimer = setTimeout(() => {
      handleRefreshElectronPreview();
    }, 3000);
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
            value: '## 工作经历\n\n' +
            '- **字节跳动** | 2021.06 - 至今\n' +
            '  - 负责公司核心产品的前端开发工作，使用 Vue3 + TypeScript 技术栈\n' +
            '  - 参与系统架构设计，制定前端开发规范和最佳实践\n' +
            '  - 优化页面性能，首屏加载时间从 3.2s 降低到 1.5s\n\n' +
            '## 项目经验\n\n' +
            '- **企业管理系统前端重构** | 2023.03 - 2023.08\n' +
            '  - 主导前端架构升级，从 Vue2 迁移到 Vue3\n' +
            '  - 引入 TypeScript 和 Pinia 状态管理，复用率提升 60%\n\n' +
            '## 教育背景\n\n' +
            '- **某某大学** | 2017.09 - 2021.06\n' +
            '  - 计算机科学与技术 | 本科',
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
      isTemporary.value = false;
      tempId.value = null;
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

      isTemporary.value = false;
      tempId.value = null;
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
      isTemporary.value = false;
      tempId.value = null;
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

      isTemporary.value = false;
      tempId.value = null;
      ElMessage.success('简历已创建并发布！');
    }
  } catch (error) {
    console.error('发布失败:', error);
    ElMessage.error('发布简历失败');
  }
};

// ============================================================
// 精确预览（Electron API）
// ============================================================
/**
 * 调用 Electron API 生成精确预览
 * 流程：Markdown → HTML → /api/preview → base64 图片 + PDF
 */
const handleRefreshElectronPreview = async () => {
  if (electronPreviewLoading.value) return;

  electronPreviewLoading.value = true;
  electronPreviewResult.value = null;
  electronPreviewError.value = '';
  electronPreviewLoadingText.value = '正在准备内容...';

  try {
    // Step 1: 将 Markdown 转为 HTML
    const htmlContent = markdownToHtml(internalMarkdown.value, resumeThemeClass.value, extraStyles.value);
    electronPreviewLoadingText.value = '正在调用 Electron API...';

    // Step 2: 调用 Electron 预览 API
    const startTime = Date.now();
    const res = await fetch('http://localhost:9999/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        html: htmlContent,
        options: {
          resumeName: currentResume.value?.title || '简历',
          marginTop: 40,
          marginBottom: 40,
          marginLeft: 50,
          marginRight: 50,
          displayHeaderFooter: true,
        },
      }),
    });

    const elapsedMs = Date.now() - startTime;

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: '未知错误' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }

    const result = await res.json();

    electronPreviewResult.value = {
      pageCount: result.pageCount,
      pdfBase64: result.pdfBase64,
    };

    electronPreviewMeta.value = `API 耗时 ${elapsedMs}ms`;

    // 自动切换到精确预览 Tab
    if (rightPanelMode.value !== 'electron') {
      rightPanelMode.value = 'electron';
    }
  } catch (err: any) {
    electronPreviewError.value = err.message || '生成精确预览失败，请确认 Electron 服务已启动（npm run electron:dev）';
    console.error('[Electron 精确预览] 失败:', err);
  } finally {
    electronPreviewLoading.value = false;
  }
};

/**
 * 下载精确预览的 PDF
 */
const handleDownloadPdf = () => {
  const result = electronPreviewResult.value;
  if (!result?.pdfBase64) {
    ElMessage.warning('尚无 PDF 可下载，请先生成精确预览');
    return;
  }

  try {
    const binary = atob(result.pdfBase64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const filename = `${currentResume.value?.title || '简历'}.pdf`;

    // 下载 PDF
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    ElMessage.success('PDF 下载已开始');

    // 同时保存到后端（不阻塞下载流程）
    if (currentResumeId.value) {
      const pdfFile = new File([blob], filename, { type: 'application/pdf' });
      updateResumeFileApi(currentResumeId.value, pdfFile).catch((err) => {
        console.warn('[保存 PDF 到后端] 失败:', err);
      });
    }
  } catch (err) {
    console.error('[下载 PDF] 失败:', err);
    ElMessage.error('PDF 下载失败');
  }
};


/**
 * Markdown → HTML 转换（用于 Electron API 调用）
 */
function markdownToHtml(markdown: string, themeClass: string, extraStyles: string): string {
  // 1. 构建与 PdfPageView 完全相同的 marked 实例
  let sectionType = '';
  const md = new Marked();
  md.use(markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code: string, lang: string) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }));
  md.use({
    renderer: {
      heading(token: any): string {
        const depth = token.depth;
        const inner = this.parser.parseInline(token.tokens);
        if (depth === 1) return `<h1 class="resume-name">${inner}</h1>\n`;
        // ### 日期拆解：检测 | 分隔符，左标题 + 右日期
        if (depth === 3) {
          const rawText = token.tokens?.map((t: any) => t.raw || t.text || '').join('') || '';
          const barIdx = rawText.indexOf('|');
          if (barIdx > 0) {
            const leftRaw = rawText.substring(0, barIdx).trim();
            const rightRaw = rawText.substring(barIdx + 1).trim();
            const slug = autoDetectSectionType(leftRaw);
            sectionType = slug;
            return `<h3 class="subsection-title" data-section-type="${slug}"><span class="project-title-text">${leftRaw}</span><span class="project-title-date">${rightRaw}</span></h3>\n`;
          }
        }
        // 自动识别 section type：根据标题文本关键词判断
        const text = inner.replace(/<[^>]+>/g, '').trim();
        const slug = autoDetectSectionType(text);
        sectionType = slug;
        if (depth === 2) {
          return `<h2 class="section-title section-title--${slug}" data-section-type="${slug}">${inner}</h2>\n`;
        }
        return `<h${depth} class="subsection-title" data-section-type="${slug}">${inner}</h${depth}>\n`;
      },
      list(token: any): string {
        let body = '';
        for (const item of token.items) body += this.listitem(item);
        let listClass = 'item-list';
        if (sectionType === 'skills' || sectionType === 'skill') listClass = 'skills-list';
        else if (sectionType === 'summary') listClass = 'summary-list';
        else if (sectionType) listClass = `${sectionType}-list`;
        const tag = token.ordered ? 'ol' : 'ul';
        const start = token.ordered && token.start !== 1 && token.start !== '' ? ` start="${token.start}"` : '';
        return `<${tag} class="${listClass}"${start}>\n${body}</${tag}>\n`;
      },
      listitem(token: any): string {
        const inner = this.parser.parse(token.tokens, !!token.loose);
        let itemClass = 'item';
        if (sectionType === 'skills' || sectionType === 'skill') itemClass = 'skill-item';
        else if (sectionType === 'summary') itemClass = 'summary-item';
        else if (sectionType === 'work') itemClass = 'work-item';
        else if (sectionType === 'projects' || sectionType === 'project') itemClass = 'project-item';
        else if (sectionType === 'education') itemClass = 'education-item';
        return `<li class="${itemClass}">${inner}</li>\n`;
      },
      paragraph(token: any): string {
        return `<p class="paragraph">${this.parser.parseInline(token.tokens)}</p>\n`;
      },
      link(token: any): string {
        const inner = this.parser.parseInline(token.tokens);
        const titleAttr = token.title ? ` title="${token.title}"` : '';
        return `<a class="link" href="${token.href}"${titleAttr}>${inner}</a>`;
      },
      image(token: any): string {
        let alt = token.text;
        if (token.tokens?.length) alt = this.parser.parseInline(token.tokens);
        const titleAttr = token.title ? ` title="${token.title}"` : '';
        return `<figure class="image-figure"><img class="image" src="${token.href}" alt="${alt}"${titleAttr} />${alt ? `<figcaption class="image-caption">${alt}</figcaption>` : ''}</figure>`;
      },
      blockquote(token: any): string {
        return `<blockquote class="blockquote">\n${this.parser.parse(token.tokens)}</blockquote>\n`;
      },
      code(token: any): string {
        const langClass = token.lang ? ` language-${token.lang}` : '';
        return `<pre class="code-block"><code class="code${langClass}">${token.text}</code></pre>\n`;
      },
      codespan(token: any): string {
        return `<code class="inline-code">${token.text}</code>`;
      },
      strong(token: any): string {
        return `<strong class="bold">${this.parser.parseInline(token.tokens)}</strong>`;
      },
      em(token: any): string {
        return `<em class="italic">${this.parser.parseInline(token.tokens)}</em>`;
      },
      del(token: any): string {
        return `<del class="strikethrough">${this.parser.parseInline(token.tokens)}</del>`;
      },
      hr(): string {
        return `<hr class="divider" />\n`;
      },
      table(this: any, token: any): string {
        let headerRow = '';
        for (const cell of token.header) headerRow += this.tablecell(cell);
        const thead = this.tablerow({ text: headerRow });
        let body = '';
        for (const row of token.rows) {
          let rowHtml = '';
          for (const cell of row) rowHtml += this.tablecell(cell);
          body += this.tablerow({ text: rowHtml });
        }
        const tbody = body ? `<tbody class="table-body">${body}</tbody>` : '';
        return `<div class="table-wrapper"><table class="table"><thead class="table-head">${thead}</thead>${tbody}</table></div>\n`;
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
    },
  });

  // 2. 预处理：提取 section type 标记
  sectionType = '';
  const lines = markdown.split('\n');
  const processed: string[] = [];
  for (const line of lines) {
    const trimmed = line.trim();
    const metaMatch = trimmed.match(/^<!--\s*(?:section:|type:)([\w-]+)(?::([\s\S]*?))?\s*-->\s*$/);
    if (metaMatch) { sectionType = metaMatch[1]; continue; }
    processed.push(line);
  }

  // 3. 解析 Markdown → HTML
  const htmlContent = md.parse(processed.join('\n')) as string;

  // 4. 组装完整 HTML 文档，内联 RESUME_CSS（与 Markdown 预览同源）
return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
/* 全局 reset */
body { background: #ffffff; }
.resume-document {
  background: var(--bg, #ffffff);
  color: var(--text-primary, #1f1f1f);
  max-width: unset !important;
  min-height: unset !important;
  box-shadow: none !important;
  border-radius: unset !important;
  margin: 0 !important;
  padding: 0 !important;
}


/* resume CSS（变量主题，与 Markdown 预览同源） */
${RESUME_CSS}

/* extraStyles（用户自定义，放在最后） */
${extraStyles}
</style>
</head>
<body>
<div class="resume-document ${themeClass || 'theme-blue'}">
${htmlContent}
</div>
</body>
</html>`;
}

// ResumeGeneratorNew.vue 第 1844 行
const handleRefreshChat = async () => {
  if (currentConversationId.value) {
    await loadMessages(currentConversationId.value);
  }
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

// 统一所有 Header 样式（核心修改：确保高度一致）
.preview-header,
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
  flex-shrink: 0;
}

// 统一预览标题按钮样式
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

// 编辑器Header样式（和其他Header统一）
.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--el-border-color);
  font-weight: 500;
  color: var(--el-text-color-primary);
  flex-shrink: 0;
}

.chat-section,
.markdown-section,
.source-section,
.style-section,
.preview-section {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;

  &:last-child {
    border-right: none;
  }
}

// Markdown、源码、样式编辑器样式
.markdown-section,
.source-section,
.style-section {
  background: var(--el-bg-color);

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
    }
  }
}

.markdown-editor :deep(.el-textarea__inner) {
  background: #1e1e1e;
  color: #d4d4d4;
}

.source-editor :deep(.el-textarea__inner) {
  background: #f5f5f5;
  color: #333;
}

// 预览区样式
.preview-section {
  background: var(--el-bg-color);

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

/* 精确预览容器 */
.electron-preview-container {
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 20px;
  background: #f5f7fa;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.electron-preview-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: 100%;
  max-width: 860px;
}

.pdf-preview-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  gap: 12px;
  color: var(--el-text-color-secondary);
  width: 100%;
}

.pdf-preview-error p {
  color: #f56c6c;
  margin: 0;
}
</style>
