<template>
  <div 
    class="template-sidebar" 
    :class="{ 'is-expanded': isExpanded }"
  >
    <!-- 顶部控制按钮 -->
    <div class="sidebar-header">
      <el-button 
        :icon="isExpanded ? Fold : Expand"
        circle
        size="small"
        @click="toggleExpand"
      />
      <span v-if="isExpanded" class="header-title">模板选择</span>
    </div>

    <!-- 模板列表 -->
    <div class="template-list">
      <div
        v-for="template in templates"
        :key="template.id"
        class="template-item"
        :class="{ 'is-active': modelValue === template.id }"
        @click="selectTemplate(template.id)"
      >
        <!-- 图标 -->
        <div class="template-icon" :style="{ background: template.color + '20' }">
          <el-icon :size="24" :color="template.color">
            <component :is="template.iconComponent" />
          </el-icon>
        </div>

        <!-- 展开时显示的信息 -->
        <div v-if="isExpanded" class="template-info">
          <div class="template-name">{{ template.name }}</div>
          <div class="template-desc">{{ template.description }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Expand, Fold, Document, Notebook, Edit, Files, Brush } from '@element-plus/icons-vue';

interface Template {
  id: string;
  name: string;
  iconComponent: any;
  description: string;
  color: string;
}

const props = defineProps<{
  modelValue: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
}>();

const isExpanded = ref(false);

const templates: Template[] = [
  {
    id: 'classic',
    name: '经典模板',
    iconComponent: Document,
    description: '通用正式/校招首选',
    color: '#3898ec',
  },
  {
    id: 'modern',
    name: '现代模板',
    iconComponent: Notebook,
    description: '互联网/技术岗',
    color: '#c96442',
  },
  {
    id: 'minimal',
    name: '简约模板',
    iconComponent: Edit,
    description: '极简干净/设计师',
    color: '#87867f',
  },
  {
    id: 'professional',
    name: '专业模板',
    iconComponent: Files,
    description: '金融/国企/传统行业',
    color: '#141413',
  },
  {
    id: 'creative',
    name: '创意模板',
    iconComponent: Brush,
    description: '暗黑科技/创意岗',
    color: '#d97757',
  }
];

const toggleExpand = () => {
  isExpanded.value = !isExpanded.value;
};

const selectTemplate = (templateId: string) => {
  emit('update:modelValue', templateId);
};
</script>

<style scoped lang="scss">
.template-sidebar {
  position: fixed;
  left: 0;
  top: 60px;
  width: 60px;
  height: calc(100vh - 60px);
  background: var(--color-ivory);
  border-right: 1px solid var(--color-border-warm);
  transition: width 0.3s ease;
  overflow: hidden;
  z-index: 100;
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.05);

  &.is-expanded {
    width: 200px;
  }
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 12px;
  border-bottom: 1px solid var(--color-border-cream);

  .header-title {
    font-size: 14px;
    font-weight: 500;
    color: var(--color-near-black);
    white-space: nowrap;
  }
}

.template-list {
  padding: 8px 0;
}

.template-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;

  &:hover {
    background: var(--color-parchment);
  }

  &.is-active {
    background: var(--next-color-primary-lighter);

    &::before {
      content: '';
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      width: 3px;
      background: var(--color-terracotta);
    }

    .template-name {
      color: var(--color-terracotta);
      font-weight: 500;
    }
  }
}

.template-icon {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: transform 0.2s;

  .template-item:hover & {
    transform: scale(1.1);
  }
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  font-size: 14px;
  color: var(--color-near-black);
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.template-desc {
  font-size: 12px;
  color: var(--color-stone-gray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
