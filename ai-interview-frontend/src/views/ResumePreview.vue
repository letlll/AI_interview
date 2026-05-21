<!-- src/views/ResumePreview.vue -->
<template>
  <div class="preview-page-container">
    <div class="preview-header">
      <h1>简历预览</h1>
      <div class="actions">
        <el-button @click="goBack">返回编辑</el-button>
        <el-button type="primary" @click="exportToPDF" :loading="isExporting" :icon="Download">
          {{ isExporting ? '导出中...' : '导出为 PDF' }}
        </el-button>
      </div>
    </div>
    <div v-if="isLoading" class="loading-container"><el-skeleton :rows="10" animated /></div>
    <div id="resume-content" class="resume-wrapper" v-else>
      <div class="resume-paper" :style="pageStyles">
        <!-- 1. content_json 有数据 → 组件渲染 -->
        <div v-if="allVisibleModules.length > 0">
          <div v-for="element in allVisibleModules" :key="element.id" class="preview-component-item">
            <component
              :is="componentMap[element.componentName]"
              v-bind="element.props"
              :style="element.styles"
            />
          </div>
        </div>
        <!-- 2. content_json 为空，但有 file_url → iframe 直接显示 PDF -->
        <iframe
          v-else-if="pdfSrc"
          :src="pdfSrc"
          class="pdf-iframe"
        />
        <!-- 3. 全部为空 → 空状态 -->
        <div v-else class="empty-tip"><el-empty description="该简历暂无内容" /></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, markRaw } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getStructuredResumeApi } from '@/api/modules/resumeEditor';
import type { ResumeItem } from '@/api/modules/resume';
import { type ResumeComponent, type ResumeLayout } from '@/store/modules/resumeEditor';
import { ElMessage, ElSkeleton, ElEmpty } from 'element-plus';
import { Download } from '@element-plus/icons-vue';
import { templates } from '@/resume-templates';
import BaseInfoModule from '@/components/resume/modules/BaseInfoModule.vue';
import SummaryModule from '@/components/resume/modules/SummaryModule.vue';
import EducationModule from '@/components/resume/modules/EducationModule.vue';
import WorkExpModule from '@/components/resume/modules/WorkExpModule.vue';
import ProjectModule from '@/components/resume/modules/ProjectModule.vue';
import SkillsModule from '@/components/resume/modules/SkillsModule.vue';
import GenericListModule from '@/components/resume/modules/GenericListModule.vue';
import CustomModule from '@/components/resume/modules/CustomModule.vue';

const route = useRoute();
const router = useRouter();

const resumeId = Number(route.params.id);
const resumeData = ref<ResumeItem | null>(null);
const resumeJson = ref<ResumeLayout>({ sidebar: [], main: [] });
const isLoading = ref(true);
const isExporting = ref(false);

const componentMap: Record<string, any> = {
  BaseInfoModule: markRaw(BaseInfoModule),
  SummaryModule: markRaw(SummaryModule),
  EducationModule: markRaw(EducationModule),
  WorkExpModule: markRaw(WorkExpModule),
  ProjectModule: markRaw(ProjectModule),
  SkillsModule: markRaw(SkillsModule),
  GenericListModule: markRaw(GenericListModule),
  CustomModule: markRaw(CustomModule),
};

const currentTemplate = computed(() => {
  const templateId = resumeData.value?.template_name || 'default';
  return templates.find(t => t.id === templateId) || templates[0];
});

const pageStyles = computed(() => currentTemplate.value.pageStyles || {});

const sidebarModules = computed(() => resumeJson.value.sidebar.filter(m => m.props.show !== false));
const mainModules = computed(() => resumeJson.value.main.filter(m => m.props.show !== false));
const allVisibleModules = computed(() => [...sidebarModules.value, ...mainModules.value]);

// 将后端相对路径 /media/... 拼成完整 URL，避免被 Vue Router 拦截
const pdfSrc = computed(() => {
  const fileUrl = resumeData.value?.file_url;
  if (!fileUrl) return '';
  // 从 VITE_API_BASE_URL 提取后端地址（去掉 /api/v1 后缀），生产环境 baseURL 为 /api/v1 时取 window.location.origin
  const apiBase = import.meta.env.VITE_API_BASE_URL || '';
  const backendBase = apiBase.replace(/\/api\/v1\/?$/, '') || window.location.origin;
  return backendBase + fileUrl;
});

onMounted(async () => {
  if (!resumeId) return;
  isLoading.value = true;
  try {
    const response = await getStructuredResumeApi(resumeId);
    resumeData.value = response;

    const template = currentTemplate.value;
    let finalLayout: ResumeLayout = { sidebar: [], main: [] };

    if (response.content_json && typeof response.content_json === 'object' && 'sidebar' in response.content_json) {
      finalLayout = response.content_json as ResumeLayout;
    } else if (Array.isArray(response.content_json)) {
      finalLayout.main = response.content_json;
    }

    const applyStyles = (components: ResumeComponent[]) => {
      components.forEach(component => {
        component.styles = template.getStylesFor(component.componentName, component.moduleType);
        if (component.componentName !== 'BaseInfoModule') {
          const templateId = template.id;
          if (templateId === 'modern-accent') component.props.titleStyle = 'style2';
          else if (templateId === 'business-gray') component.props.titleStyle = 'style3';
          else if (templateId === 'sidebar-darkblue') component.props.titleStyle = 'style4';
          else component.props.titleStyle = 'style1';
        }
      });
    };

    applyStyles(finalLayout.sidebar);
    applyStyles(finalLayout.main);
    resumeJson.value = finalLayout;

  } catch (error) {
    console.error(error);
    ElMessage.error('加载简历数据失败');
  } finally {
    isLoading.value = false;
  }
});

const goBack = () => {
  router.push({ name: 'ResumeEditor', params: { id: resumeId } });
};

	const ELECTRON_PDF_URL = 'http://localhost:9999';

	const exportToPDF = async () => {
	  isExporting.value = true;
	  try {
	    const health = await fetch(`${ELECTRON_PDF_URL}/health`).then(r => r.ok).catch(() => false);
	    if (!health) { ElMessage.error('PDF 导出需要 Electron 桌面端运行'); return; }

	    const html = '<!DOCTYPE html>' + document.documentElement.outerHTML;
	    const res = await fetch(`${ELECTRON_PDF_URL}/api/pdf`, {
	      method: 'POST',
	      headers: { 'Content-Type': 'application/json' },
	      body: JSON.stringify({
	        html,
	        options: { resumeName: resumeData.value?.title || '未命名简历' },
	      }),
	    });

	    if (!res.ok) {
	      const err = await res.json().catch(() => ({ error: '未知错误' }));
	      throw new Error(err.error || `导出失败 (${res.status})`);
	    }

	    const pdfBlob = await res.blob();
	    const url = URL.createObjectURL(pdfBlob);
	    const a = document.createElement('a');
	    a.href = url;
	    a.download = `简历-${resumeData.value?.title || '未命名'}.pdf`;
	    a.click();
	    URL.revokeObjectURL(url);
	  } catch (error: any) {
	    console.error('导出PDF失败:', error);
	    ElMessage.error(error.message || '导出PDF时发生未知错误');
	  } finally {
	    isExporting.value = false;
	  }
	};
</script>

<style lang="scss" scoped>
.preview-page-container { background-color: var(--color-parchment); min-height: 100vh; }
.preview-header { display: flex; justify-content: space-between; align-items: center; padding: 12px 24px; background-color: var(--color-ivory); box-shadow: 0 2px 8px rgba(0,0,0,0.1); position: sticky; top: 0; z-index: 10; }
.loading-container { max-width: 210mm; margin: 20px auto; padding: 20px; background: var(--color-ivory); }
.resume-wrapper { padding: 30px 0; display: flex; justify-content: center; }
.resume-paper { width: 210mm; min-height: 297mm; background-color: var(--color-white); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); transition: all 0.3s; }

.preview-component-item {
  border-bottom: none;
  background-color: var(--color-white);
}
.canvas-area .preview-component-item:not(:last-child) {
    border-bottom: 1px solid var(--color-parchment);
}
.empty-tip { padding-top: 100px; }
.pdf-iframe { width: 100%; height: 100%; border: none; min-height: 600px; }
</style>
