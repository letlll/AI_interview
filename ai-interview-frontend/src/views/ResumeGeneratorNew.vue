<template>
  <div class="resume-generator-new">
    <!-- 左侧模板选择栏 -->
    <TemplateSidebar v-model="selectedTemplate" />

    <!-- 主内容区 -->
    <div class="main-content" :style="{ marginLeft: sidebarWidth }">
      <!-- 顶部工具栏 -->
      <div class="top-toolbar">
        <h1 class="page-title">AI 简历生成器</h1>
        <div class="toolbar-actions">
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
          
          <el-button @click="handleSave" :disabled="!hasResumeData">
            <el-icon><DocumentCopy /></el-icon>
            保存简历
          </el-button>
          <el-button type="primary" @click="handleExport" :disabled="!hasResumeData">
            <el-icon><Download /></el-icon>
            导出 PDF
          </el-button>
        </div>
      </div>

      <!-- 中间和右侧内容区 -->
      <div class="content-grid" :class="{ 'preview-collapsed': isPreviewCollapsed }">
        <!-- 中间：AI 对话区 -->
        <div class="chat-section">
          <AIChatPanel
            ref="chatPanelRef"
            @message-sent="handleUserMessage"
          />
        </div>

        <!-- 右侧：简历预览区 -->
        <div class="preview-section" v-show="!isPreviewCollapsed">
          <ResumePreviewPanel
            :resume-data="resumeData"
            :template-id="selectedTemplate"
            @save="handleSave"
            @export="handleExport"
            @field-change="handleFieldChange"
          />
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
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import { DocumentCopy, Download, DArrowLeft, DArrowRight, View } from '@element-plus/icons-vue';
import TemplateSidebar from './ResumeGenerator/components/TemplateSidebar.vue';
import AIChatPanel from './ResumeGenerator/components/AIChatPanel.vue';
import ResumePreviewPanel from './ResumeGenerator/components/ResumePreviewPanel.vue';
import { generateResumeApi, generateResumeFromChatApi, type AIResumeResponse, type AIResumeInstruction } from '@/api/modules/resumeEditor';
import { createResumeApi } from '@/api/modules/resume';
import { useResumeAI, type ResumeData as AIResumeData, type Message } from '@/composables/useResumeAI';
import { useVersionHistory } from '@/composables/useVersionHistory';

interface BasicInfo {
  name?: string;
  phone?: string;
  email?: string;
  location?: string;
}

interface WorkExperience {
  company: string;
  position: string;
  duration: string;
  description: string[];
}

interface Project {
  name: string;
  role: string;
  duration: string;
  description: string[];
}

interface Education {
  school: string;
  major: string;
  degree: string;
  duration: string;
}

interface ResumeData {
  basicInfo?: BasicInfo;
  skills?: string[];
  workExperience?: WorkExperience[];
  projects?: Project[];
  education?: Education[];
}

const router = useRouter();
const chatPanelRef = ref<InstanceType<typeof AIChatPanel>>();
const selectedTemplate = ref('classic');
const resumeData = ref<ResumeData | null>(null);
const sidebarWidth = ref('60px'); // 默认收起状态

// 初始化 AI 工具和版本管理
const { buildOptimizedPrompt, applyInstructions, detectIntent } = useResumeAI();
const { addVersion, getVersionDigest, revertTo, versions } = useVersionHistory();
const chatHistory = ref<Message[]>([]);
const lastEditedField = ref<string>();
const isPreviewCollapsed = ref(false); // 默认显示预览

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

const hasResumeData = computed(() => {
  return resumeData.value && Object.keys(resumeData.value).length > 0;
});

// 处理用户发送的消息
const handleUserMessage = async (message: string) => {
  if (!chatPanelRef.value) return;

  // 添加用户消息到历史
  const userMessage: Message = {
    role: 'user',
    content: message,
    timestamp: Date.now()
  };
  chatHistory.value.push(userMessage);

  // 设置加载状态
  chatPanelRef.value.setLoading(true);

  try {
    // 构建优化后的 Prompt
    const optimizedPrompt = buildOptimizedPrompt(
      message,
      resumeData.value as AIResumeData || {},
      chatHistory.value,
      lastEditedField.value
    );

    console.log('优化后的 Prompt:', optimizedPrompt);
    console.log('Token 估算:', Math.ceil(optimizedPrompt.length / 4));

    // 调用 AI API（这里使用模拟数据）
    const response = await generateResumeFromChat(message, optimizedPrompt);
    
    // 应用更新指令
    if (response.instructions && response.instructions.length > 0) {
      console.log('收到更新指令:', response.instructions);
      console.log('当前简历数据:', resumeData.value);
      
      const oldData = resumeData.value;
      const newData = applyInstructions(
        resumeData.value as AIResumeData || {},
        response.instructions
      ) as ResumeData;
      
      console.log('应用指令后的数据:', newData);
      resumeData.value = newData;

      // 保存版本
      const intent = detectIntent(message, lastEditedField.value);
      addVersion(
        resumeData.value as AIResumeData,
        response.message,
        response.instructions,
        intent
      );
      
      console.log('最终简历数据:', resumeData.value);
    }

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

// 处理字段编辑
const handleFieldChange = (path: string, value: string) => {
  lastEditedField.value = path;
  console.log(`字段修改: ${path} = ${value}`);
  
  // 保存版本
  if (resumeData.value) {
    addVersion(
      resumeData.value as AIResumeData,
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
      lastEditedField.value
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
            path: 'skills',
            value: ['Vue.js', 'React', 'TypeScript', 'JavaScript', 'HTML/CSS', 'Node.js', 'Git'],
            reason: '添加前端技能'
          },
          {
            action: 'add',
            path: 'workExperience',
            value: {
              company: '某科技有限公司',
              position: '前端工程师',
              duration: '2021.06 - 至今',
              description: [
                '负责公司核心产品的前端开发工作，使用 Vue3 + TypeScript 技术栈',
                '参与系统架构设计，制定前端开发规范和最佳实践',
                '优化页面性能，首屏加载时间从 3.2s 降低到 1.5s，提升用户体验',
                '带领团队完成多个重要项目，按时交付高质量代码'
              ]
            },
            reason: '添加工作经历'
          },
          {
            action: 'add',
            path: 'projects',
            value: {
              name: '企业管理系统前端重构',
              role: '前端负责人',
              duration: '2023.03 - 2023.08',
              description: [
                '主导企业管理系统前端架构升级，从 Vue2 迁移到 Vue3',
                '引入 TypeScript 和 Pinia 状态管理，提升代码可维护性',
                '实现组件库标准化，复用率提升 60%',
                '优化构建流程，打包体积减少 40%'
              ]
            },
            reason: '添加项目经验'
          },
          {
            action: 'add',
            path: 'education',
            value: {
              school: '某某大学',
              major: '计算机科学与技术',
              degree: '本科',
              duration: '2017.09 - 2021.06'
            },
            reason: '添加教育背景'
          }
        ],
        message: '✅ 我已经为你生成了一份前端工程师的简历框架！\n\n包含：\n• 基本信息\n• 7项核心技能\n• 1段工作经历\n• 1个项目经验\n• 教育背景\n\n你可以点击任意字段进行编辑，或者告诉我需要优化的地方。\n\n⚠️ 注意：当前使用模拟数据，后端接口连接失败。'
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
    await createResumeApi({
      title: `AI生成简历-${resumeData.value.basicInfo?.name || '未命名'}`,
      status: 'draft',
      content_json: resumeData.value,
      template_name: selectedTemplate.value,
    } as any);

    ElMessage.success('简历保存成功！');
    router.push({ name: 'ResumeManagement' });
  } catch (error) {
    console.error('保存失败:', error);
    ElMessage.error('保存简历失败');
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
.preview-section {
  height: 100%;
  min-height: 0; // 关键：允许子元素收缩
  overflow: hidden; // 防止内容溢出
  border-right: 1px solid var(--el-border-color);
  
  &:last-child {
    border-right: none;
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
