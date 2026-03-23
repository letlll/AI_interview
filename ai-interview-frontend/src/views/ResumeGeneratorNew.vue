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

          <el-divider direction="vertical" />

          <!-- 编辑模式切换 -->
          <el-radio-group v-model="editMode" size="small" @change="switchEditMode">
            <el-radio-button value="ai">AI 对话</el-radio-button>
            <el-radio-button value="markdown">Markdown</el-radio-button>
            <el-radio-button value="source">源码</el-radio-button>
            <el-radio-button value="style">样式</el-radio-button>
          </el-radio-group>

          <el-divider direction="vertical" />

          <!-- 预览切换按钮 -->
          <el-button
            @click="togglePreview"
            :type="isPreviewCollapsed ? 'default' : 'primary'"
            plain
          >
            <el-icon><View /></el-icon>
            {{ isPreviewCollapsed ? '显示预览' : '隐藏预览' }}
          </el-button>

          <el-divider direction="vertical" />

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

      <!-- 中间和右侧内容区 -->
      <div class="content-grid" :class="{ 'preview-collapsed': isPreviewCollapsed }">

        <!-- AI 对话模式 -->
        <template v-if="editMode === 'ai'">
          <div class="chat-section">
            <AIChatPanel
              ref="chatPanelRef"
              @message-sent="handleUserMessage"
            />
          </div>
        </template>

        <!-- Markdown 编辑模式 -->
        <template v-else-if="editMode === 'markdown'">
          <div class="markdown-section">
            <div class="editor-header">
              <span>Markdown 编辑</span>
              <el-button size="small" text @click="internalMarkdown = jsonToResumeMarkdown(resumeData)">
                刷新预览
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
            <StyleAdjustmentPanel :extraStyles="extraStyles" @update:extraStyles="onExtraStylesUpdate" />
          </div>
        </template>

        <!-- 右侧：简历预览区 -->
        <div class="preview-section" v-show="!isPreviewCollapsed">
          <div class="preview-header">
            <span>简历预览</span>
          </div>
          <div class="preview-content">
            <MarkdownRenderer
              :content="internalMarkdown"
              :theme-class="resumeThemeClass"
              :extra-styles="extraStyles"
              @section-title-change="handleSectionTitleChange"
              @content-change="handleContentChange"
              @extra-styles-append="v => extraStyles += '\n' + v"
              ref="markdownRendererRef"
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
import { ref, computed, watch, onMounted } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { DocumentCopy, Download, DArrowLeft, DArrowRight, View, Plus, Edit, Promotion, Loading, EditPen } from '@element-plus/icons-vue';
import TemplateSidebar from './ResumeGenerator/components/TemplateSidebar.vue';
import AIChatPanel from './ResumeGenerator/components/AIChatPanel.vue';
import ResumePreviewPanel from './ResumeGenerator/components/ResumePreviewPanel.vue';
import StyleAdjustmentPanel from './ResumeGenerator/components/StyleAdjustmentPanel.vue';
import MarkdownRenderer from '@/components/common/MarkdownRenderer.vue';
import { generateResumeApi, generateResumeFromChatApi, createAIConversationApi, getAIMessagesApi, sendAIMessageApi, type AIResumeResponse, type AIResumeInstruction } from '@/api/modules/resumeEditor';
import { createResumeApi, getResumeListApi , updateResumeApi } from '@/api/modules/resume';
import { useResumeAI, type ResumeData as AIResumeData, type Message, cleanInvalidKeys } from '@/composables/useResumeAI';
import { useVersionHistory } from '@/composables/useVersionHistory';
import { jsonToResumeMarkdown } from '@/utils/resumeMarkdown';
import { set } from 'lodash-es';

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
const editMode = ref<'ai' | 'markdown' | 'source'| 'style'>('ai'); // ai对话 / markdown编辑 / 源码模式
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

// 获取简历数据（合并 extraStyles）
const getResumeDataToSave = () => ({
  ...resumeData.value,
  extraStyles: extraStyles.value
});

// 接收 StyleAdjustmentPanel 的样式更新
function onExtraStylesUpdate(v: string) {
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

    // 创建新对话并绑定简历
    const newConv = await createAIConversationApi(newResume.id);
    currentConversationId.value = newConv.id;

    // 添加到列表并选中
    await loadResumeList();
    currentResumeId.value = newResume.id;

    // 清空聊天历史
    chatHistory.value = [];
    if (chatPanelRef.value) {
      chatPanelRef.value.setMessages([]);
    }

    ElMessage.success('已创建新简历');
  } catch (error) {
    console.error('创建简历失败:', error);
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
const switchEditMode = (mode: 'ai' | 'markdown' | 'source' | 'style') => {
  editMode.value = mode;
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
  try {
    const parsed = JSON.parse(sourceCode.value);
    resumeData.value = parsed;
    // content 可能为 ''，不能用 if (parsed.content) 判断
    if (parsed.content !== undefined) {
      internalMarkdown.value = parsed.content;
    }
    ElMessage.success('已更新');
  } catch (e) {
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
      internalMarkdown.value
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

// 导出简历
const handleExport = () => {
  if (!resumeData.value) {
    ElMessage.warning('暂无简历内容可导出');
    return;
  }

  // TODO: 实现 PDF 导出功能
  ElMessage.info('PDF 导出功能开发中...');
};

const resumeThemeClass = ref('theme-blue');   // 初始值

const handleThemeClassChange = (themeClass: string) => {
  resumeThemeClass.value = themeClass;
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

.chat-section,
.markdown-section,
.source-section,
.style-section,
.preview-section {
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border-right: 1px solid var(--el-border-color);

  &:last-child {
    border-right: none;
  }
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

  .preview-content {
    flex: 1;
    overflow: auto;
    padding: 20px;
    background: #fff;
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
</style>
