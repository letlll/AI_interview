<template>
  <div class="resume-preview-panel">
    <!-- 工具栏 -->
    <div class="preview-toolbar">
      <div class="toolbar-title">
        <el-icon><Document /></el-icon>
        <span>实时预览</span>
      </div>
      <div class="toolbar-actions">
        <!-- 编辑模式切换 -->
        <el-radio-group v-model="editMode" size="small" style="margin-right: 12px">
          <el-radio-button value="preview">
            <el-icon><View /></el-icon>
          </el-radio-button>
          <el-radio-button value="source">
            <el-icon><EditPen /></el-icon>
          </el-radio-button>
        </el-radio-group>
        
        <el-button size="small" @click="handleSave">
          <el-icon><DocumentCopy /></el-icon>
          保存
        </el-button>
        <el-button size="small" @click="handleExport">
          <el-icon><Download /></el-icon>
          导出
        </el-button>
      </div>
    </div>

    <!-- 预览内容 -->
    <div class="preview-content" ref="previewContent">
      <div v-if="!resumeData" class="empty-state">
        <el-icon :size="64" color="var(--el-text-color-placeholder)">
          <Document />
        </el-icon>
        <p>开始与 AI 对话生成简历内容</p>
      </div>

      <!-- 简历渲染区 -->
      <div v-else-if="editMode === 'preview'" class="resume-render" :class="`template-${templateId}`">
        <!-- 基本信息 -->
        <div class="resume-section basic-info">
          <h1 class="resume-name">
            <EditableField
              :model-value="resumeData.basicInfo?.name || '姓名'"
              :path="'basicInfo.name'"
              @change="handleFieldChange"
            />
          </h1>
          <div class="contact-info">
            <span v-if="resumeData.basicInfo?.phone || editMode === 'preview'">
              <el-icon><Phone /></el-icon>
              <EditableField
                :model-value="resumeData.basicInfo?.phone || ''"
                :path="'basicInfo.phone'"
                placeholder="电话"
                @change="handleFieldChange"
              />
            </span>
            <span v-if="resumeData.basicInfo?.email || editMode === 'preview'">
              <el-icon><Message /></el-icon>
              <EditableField
                :model-value="resumeData.basicInfo?.email || ''"
                :path="'basicInfo.email'"
                placeholder="邮箱"
                @change="handleFieldChange"
              />
            </span>
            <span v-if="resumeData.basicInfo?.location || editMode === 'preview'">
              <el-icon><Location /></el-icon>
              <EditableField
                :model-value="resumeData.basicInfo?.location || ''"
                :path="'basicInfo.location'"
                placeholder="位置"
                @change="handleFieldChange"
              />
            </span>
          </div>
        </div>

        <!-- 专业技能 -->
        <div v-if="resumeData.skills?.length" class="resume-section">
          <h2 class="section-title">专业技能</h2>
          <div class="skills-list">
            <el-tag
              v-for="(skill, index) in resumeData.skills"
              :key="index"
              type="info"
              effect="plain"
            >
              {{ skill }}
            </el-tag>
          </div>
        </div>

        <!-- 工作经历 -->
        <div v-if="resumeData.workExperience?.length" class="resume-section">
          <h2 class="section-title">工作经历</h2>
          <div
            v-for="(work, index) in resumeData.workExperience"
            :key="index"
            class="work-item"
          >
            <div class="work-header">
              <div class="work-title">
                <strong>{{ work.position }}</strong>
                <span class="work-company">{{ work.company }}</span>
              </div>
              <div class="work-duration">{{ work.duration }}</div>
            </div>
            <ul class="work-description">
              <li v-for="(desc, i) in work.description" :key="i">{{ desc }}</li>
            </ul>
          </div>
        </div>

        <!-- 项目经验 -->
        <div v-if="resumeData.projects?.length" class="resume-section">
          <h2 class="section-title">项目经验</h2>
          <div
            v-for="(project, index) in resumeData.projects"
            :key="index"
            class="project-item"
          >
            <div class="project-header">
              <strong>{{ project.name }}</strong>
              <span class="project-duration">{{ project.duration }}</span>
            </div>
            <div class="project-role">{{ project.role }}</div>
            <ul class="project-description">
              <li v-for="(desc, i) in project.description" :key="i">{{ desc }}</li>
            </ul>
          </div>
        </div>

        <!-- 教育背景 -->
        <div v-if="resumeData.education?.length" class="resume-section">
          <h2 class="section-title">教育背景</h2>
          <div
            v-for="(edu, index) in resumeData.education"
            :key="index"
            class="education-item"
          >
            <div class="education-header">
              <strong>{{ edu.school }}</strong>
              <span class="education-duration">{{ edu.duration }}</span>
            </div>
            <div class="education-major">{{ edu.major }} · {{ edu.degree }}</div>
          </div>
        </div>
      </div>

      <!-- 源码编辑模式 -->
      <div v-else-if="editMode === 'source'" class="source-editor">
        <el-input
          v-model="sourceCode"
          type="textarea"
          :rows="20"
          placeholder="JSON 格式的简历数据"
          @blur="handleSourceCodeChange"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Document, DocumentCopy, Download, Phone, Message, Location, View, EditPen } from '@element-plus/icons-vue';
import { ElMessage } from 'element-plus';
import EditableField from '@/components/resume/EditableField.vue';

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

const props = defineProps<{
  resumeData: ResumeData | null;
  templateId: string;
}>();

const emit = defineEmits<{
  (e: 'save'): void;
  (e: 'export'): void;
  (e: 'field-change', path: string, value: string): void;
}>();

const editMode = ref<'preview' | 'source'>('preview');
const sourceCode = ref('');

// 监听 resumeData 变化，更新源码
import { watch } from 'vue';
watch(() => props.resumeData, (newData) => {
  if (newData && editMode.value === 'source') {
    sourceCode.value = JSON.stringify(newData, null, 2);
  }
}, { immediate: true });

// 监听编辑模式切换
watch(editMode, (newMode) => {
  if (newMode === 'source' && props.resumeData) {
    sourceCode.value = JSON.stringify(props.resumeData, null, 2);
  }
});

const handleFieldChange = (path: string, value: string) => {
  emit('field-change', path, value);
};

const handleSourceCodeChange = () => {
  try {
    const parsed = JSON.parse(sourceCode.value);
    // 触发整个简历数据的更新
    emit('field-change', '', parsed);
    ElMessage.success('源码已更新');
  } catch (error) {
    ElMessage.error('JSON 格式错误，请检查');
  }
};

const previewContent = ref<HTMLElement>();

const handleSave = () => {
  if (!props.resumeData) {
    ElMessage.warning('暂无简历内容可保存');
    return;
  }
  emit('save');
};

const handleExport = () => {
  if (!props.resumeData) {
    ElMessage.warning('暂无简历内容可导出');
    return;
  }
  emit('export');
};
</script>

<style scoped lang="scss">
.resume-preview-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.preview-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.toolbar-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 500;
  color: var(--el-text-color-primary);
}

.toolbar-actions {
  display: flex;
  gap: 8px;
}

.preview-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background: var(--el-fill-color-lighter);
  
  // 美化滚动条
  &::-webkit-scrollbar {
    width: 8px;
  }
  
  &::-webkit-scrollbar-track {
    background: transparent;
  }
  
  &::-webkit-scrollbar-thumb {
    background: var(--el-border-color-light);
    border-radius: 4px;
    transition: background 0.3s;
    
    &:hover {
      background: var(--el-border-color);
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: var(--el-text-color-secondary);
  
  p {
    margin-top: 16px;
    font-size: 14px;
  }
}

.resume-render {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  background: var(--color-white);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 1000px;
}

.resume-section {
  margin-bottom: 32px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.basic-info {
  text-align: center;
  padding-bottom: 24px;
  border-bottom: 2px solid var(--el-color-primary);
}

.resume-name {
  font-size: 32px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 12px 0;
}

.contact-info {
  display: flex;
  justify-content: center;
  gap: 24px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  
  span {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid var(--el-border-color);
}

.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.work-item,
.project-item,
.education-item {
  margin-bottom: 20px;
  
  &:last-child {
    margin-bottom: 0;
  }
}

.work-header,
.project-header,
.education-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
}

.work-title {
  display: flex;
  align-items: baseline;
  gap: 12px;
  
  strong {
    font-size: 16px;
    color: var(--el-text-color-primary);
  }
}

.work-company {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

.work-duration,
.project-duration,
.education-duration {
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.source-editor {
  padding: 20px;
  height: 100%;
  
  :deep(.el-textarea__inner) {
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.6;
    background: var(--el-fill-color-lighter);
  }
}

.work-description,
.project-description {
  margin: 8px 0 0 0;
  padding-left: 20px;
  
  li {
    color: var(--el-text-color-regular);
    line-height: 1.8;
    margin-bottom: 4px;
  }
}

.project-role {
  color: var(--el-text-color-regular);
  font-size: 14px;
  margin-bottom: 8px;
}

.education-major {
  color: var(--el-text-color-regular);
  font-size: 14px;
}

// 不同模板的样式
.template-modern {
  .section-title {
    color: var(--el-color-primary);
    border-bottom-color: var(--el-color-primary);
  }
}

.template-minimal {
  .basic-info {
    border-bottom: none;
  }
  
  .section-title {
    border-bottom: none;
    font-weight: 500;
  }
}
</style>
