<template>
  <div 
    class="editable-field"
    :class="{ 
      'is-editing': isEditing,
      'is-hover': isHover,
      'is-multiline': type === 'textarea'
    }"
    @mouseenter="isHover = true"
    @mouseleave="isHover = false"
  >
    <!-- 显示模式 -->
    <div v-if="!isEditing" class="field-display" @click="startEdit">
      <span class="field-content">{{ displayValue }}</span>
      <el-icon v-show="isHover" class="edit-icon">
        <Edit />
      </el-icon>
    </div>

    <!-- 编辑模式 -->
    <div v-else class="field-edit">
      <el-input
        v-if="type === 'text'"
        v-model="editValue"
        ref="inputRef"
        @blur="handleBlur"
        @keyup.enter="saveEdit"
        @keyup.esc="cancelEdit"
        :placeholder="placeholder"
      />
      <el-input
        v-else
        v-model="editValue"
        type="textarea"
        :rows="rows"
        ref="inputRef"
        @blur="handleBlur"
        @keyup.esc="cancelEdit"
        :placeholder="placeholder"
      />
      <div class="edit-actions">
        <el-button size="small" type="primary" @click="saveEdit">
          <el-icon><Check /></el-icon>
        </el-button>
        <el-button size="small" @click="cancelEdit">
          <el-icon><Close /></el-icon>
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue';
import { Edit, Check, Close } from '@element-plus/icons-vue';

const props = withDefaults(defineProps<{
  modelValue: string;
  path: string;
  type?: 'text' | 'textarea';
  rows?: number;
  placeholder?: string;
  emptyText?: string;
}>(), {
  type: 'text',
  rows: 3,
  placeholder: '点击编辑',
  emptyText: '未填写'
});

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'change', path: string, value: string): void;
}>();

const isEditing = ref(false);
const isHover = ref(false);
const editValue = ref(props.modelValue);
const inputRef = ref();

const displayValue = computed(() => {
  return props.modelValue || props.emptyText;
});

const startEdit = () => {
  isEditing.value = true;
  editValue.value = props.modelValue;
  nextTick(() => {
    inputRef.value?.focus();
  });
};

const saveEdit = () => {
  const trimmed = editValue.value.trim();
  if (trimmed !== props.modelValue) {
    emit('update:modelValue', trimmed);
    emit('change', props.path, trimmed);
  }
  isEditing.value = false;
};

const cancelEdit = () => {
  editValue.value = props.modelValue;
  isEditing.value = false;
};

const handleBlur = () => {
  // 延迟关闭，让按钮点击事件先触发
  setTimeout(() => {
    if (isEditing.value) {
      saveEdit();
    }
  }, 200);
};
</script>

<style scoped lang="scss">
.editable-field {
  position: relative;
  transition: all 0.2s;
  
  &.is-hover:not(.is-editing) {
    .field-display {
      background: var(--el-fill-color-light);
      border-color: var(--el-border-color);
    }
  }
  
  &.is-editing {
    z-index: 10;
  }
}

.field-display {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid transparent;
  cursor: pointer;
  transition: all 0.2s;
  min-height: 32px;
  
  .is-multiline & {
    align-items: flex-start;
    min-height: 60px;
  }
}

.field-content {
  flex: 1;
  word-break: break-word;
  white-space: pre-wrap;
  
  .is-multiline & {
    line-height: 1.6;
  }
}

.edit-icon {
  flex-shrink: 0;
  color: var(--el-color-primary);
  opacity: 0.6;
  transition: opacity 0.2s;
  
  .field-display:hover & {
    opacity: 1;
  }
}

.field-edit {
  position: relative;
}

.edit-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  justify-content: flex-end;
}
</style>
