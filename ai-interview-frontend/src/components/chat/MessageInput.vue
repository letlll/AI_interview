<!-- src/components/chat/MessageInput.vue -->
<template>
  <div class="mi-root">
    <!-- Toolbar -->
    <div class="mi-toolbar">
      <el-tooltip content="发送图片">
        <el-upload
          action="#"
          :show-file-list="false"
          :http-request="handleFileUpload"
          :before-upload="beforeImageUpload"
        >
          <el-icon class="mi-tool-btn" :size="18"><Picture /></el-icon>
        </el-upload>
      </el-tooltip>
      <el-tooltip content="发送文件">
        <el-upload
          action="#"
          :show-file-list="false"
          :http-request="handleFileUpload"
          :before-upload="beforeFileUpload"
        >
          <el-icon class="mi-tool-btn" :size="18"><FolderOpened /></el-icon>
        </el-upload>
      </el-tooltip>
    </div>

    <!-- Rich text editor -->
    <RichTextEditor v-model="newMessage" placeholder="输入消息..." />

    <!-- Footer -->
    <div class="mi-footer">
      <span class="mi-counter">{{ newMessage.length }} / 500</span>
      <el-button type="primary" @click="handleSend" :disabled="!newMessage.trim() && !isUploading" class="mi-send-btn">
        发送 (Enter)
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useChatStore } from '@/store/modules/chat';
import { ElMessage } from 'element-plus';
import { Picture, FolderOpened } from '@element-plus/icons-vue';
import { uploadFileApi } from '@/api/modules/common';
import type { UploadRequestOptions } from 'element-plus';
import { debounce } from 'lodash-es';
import RichTextEditor from '@/components/common/RichTextEditor.vue';

const chatStore = useChatStore();
const newMessage = ref('');
const isUploading = ref(false);

const handleSend = () => {
  if (!newMessage.value.trim()) return;
  chatStore.sendMessage({ content: newMessage.value, message_type: 'text' });
  newMessage.value = '';
  sendStopTyping();
};

const sendStopTyping = debounce(() => { chatStore.sendTypingIndicator(false); }, 2000);

const beforeImageUpload = (file: File) => {
  const isImage = file.type.startsWith('image/');
  if (!isImage) { ElMessage.error('只能上传图片文件!'); return false; }
  const isLt5M = file.size / 1024 / 1024 < 5;
  if (!isLt5M) { ElMessage.error('图片大小不能超过 5MB!'); return false; }
  return true;
};

const beforeFileUpload = (file: File) => {
  const isLt20M = file.size / 1024 / 1024 < 20;
  if (!isLt20M) { ElMessage.error('文件大小不能超过 20MB!'); return false; }
  return true;
};

const handleFileUpload = async (options: UploadRequestOptions) => {
  isUploading.value = true;
  try {
    const response = await uploadFileApi(options.file, 'chat_files');
    const message_type = options.file.type.startsWith('image/') ? 'image' : 'file';
    chatStore.sendMessage({ content: options.file.name, message_type, file_url: response.file_url });
  } catch (error) {
    ElMessage.error('文件上传失败');
  } finally {
    isUploading.value = false;
  }
};
</script>

<style lang="scss" scoped>
.mi-root { padding: 12px 16px; }
.mi-toolbar { display: flex; gap: 6px; margin-bottom: 8px; }
.mi-tool-btn {
  color: var(--color-stone-gray);
  cursor: pointer;
  transition: color 0.15s;
}
.mi-tool-btn:hover { color: var(--color-terracotta); }
.mi-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; }
.mi-counter { font-size: 12px; color: var(--color-warm-silver); }
.mi-send-btn { border-radius: 8px; }
</style>
