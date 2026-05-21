<!-- src/components/chat/MessageItem.vue -->
<template>
  <div class="msg-row" :class="isMe && !isAi ? 'is-me' : 'is-other'">
    <div v-if="isAi" class="msg-avatar">
      <el-avatar :size="32" class="ai-avatar">AI</el-avatar>
    </div>

    <div class="msg-body">
      <div v-if="isAi" class="msg-sender msg-sender-ai">AI 助手</div>
      <div v-else-if="!isMe" class="msg-sender">{{ message.sender.username }}</div>

      <div class="msg-bubble" :class="isAi ? 'bubble-ai' : isMe ? 'bubble-me' : 'bubble-other'">
        <p v-if="message.message_type === 'text'" class="msg-text" v-html="sanitize(message.content)"></p>

        <div v-else-if="message.message_type === 'image'">
          <el-image
            :src="getFullUrl(message.file_url)"
            :preview-src-list="[getFullUrl(message.file_url)]"
            fit="cover"
            class="msg-image"
            style="max-height: 200px;"
          >
            <template #error>
              <div class="msg-image-error">
                <el-icon><Picture /></el-icon>
              </div>
            </template>
          </el-image>
        </div>

        <div v-else-if="message.message_type === 'file'" class="msg-file">
          <el-icon :size="24"><Folder /></el-icon>
          <a :href="getFullUrl(message.file_url)" target="_blank" rel="noopener noreferrer" class="msg-file-link">
            {{ message.content || '点击下载文件' }}
          </a>
        </div>

        <div v-else class="msg-unsupported">
          <el-icon><Warning /></el-icon>
          <span>不支持的消息类型: {{ message.message_type }}</span>
        </div>
      </div>

      <div class="msg-time">{{ formatDateTime(message.timestamp, 'HH:mm') }}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '@/store/modules/auth';
import type { Message } from '@/api/modules/chat';
import { formatDateTime } from '@/utils/format';
import { Folder, Warning, Picture } from '@element-plus/icons-vue';
import DOMPurify from 'isomorphic-dompurify';

const props = defineProps<{ message: Message }>();
const authStore = useAuthStore();
const isMe = computed(() => props.message.sender.id === authStore.user?.id);
const isAi = computed(() => props.message.metadata?.is_ai_response === true);
const sanitize = (html: string): string => DOMPurify.sanitize(html);

const getFullUrl = (url: string | null) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('https') || url.startsWith('blob:')) return url;
  let baseUrl = '';
  if (import.meta.env.DEV) {
    baseUrl = 'http://127.0.0.1:8000';
  } else {
    baseUrl = import.meta.env.VITE_API_BASE_URL?.replace(/\/api\/v1\/?$/, '') || '';
  }
  if (baseUrl.endsWith('/')) baseUrl = baseUrl.slice(0, -1);
  if (!url.startsWith('/')) url = `/${url}`;
  return `${baseUrl}${url}`;
};
</script>

<style lang="scss" scoped>
.msg-row {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  &.is-me { justify-content: flex-end; }
}
.msg-avatar { flex-shrink: 0; padding-top: 2px; }
.msg-body { max-width: 70%; }

/* Overline: Anthropic Sans 10px / 400 / 1.60 / 0.5px / uppercase */
.msg-sender {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 10px;
  font-weight: 400;
  line-height: 1.60;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-stone-gray);
  margin-bottom: 4px;
  margin-left: 2px;
}
.msg-sender-ai {
  color: var(--color-terracotta);
  font-weight: 500;
}

.ai-avatar {
  background: var(--color-terracotta) !important;
  color: var(--color-ivory) !important;
  font-weight: 500;
}

/* Bubble — comfortably rounded, relaxed body line-height */
.msg-bubble {
  padding: 10px 14px;
  border-radius: 8px;
  line-height: 1.60;
}
.bubble-me {
  background: var(--color-terracotta);
  color: var(--color-ivory);
}
.bubble-other {
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
}
.bubble-ai {
  background: var(--color-ivory);
  color: var(--color-near-black);
  border: 1px solid var(--color-border-cream);
}

/* Caption: Anthropic Sans 14px / 400 / 1.43 */
.msg-text {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 0;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  -webkit-user-select: text;
  user-select: text;
}
.msg-text :deep(a) { color: inherit; text-decoration: underline; }

.msg-image { max-width: 100%; border-radius: 8px; cursor: zoom-in; }
.msg-image-error {
  display: flex; align-items: center; justify-content: center;
  width: 96px; height: 96px; border-radius: 8px;
  background: var(--color-parchment); color: var(--color-warm-silver);
}
.msg-file { display: flex; align-items: center; gap: 8px; }
.msg-file-link { color: inherit; }
.msg-file-link:hover { text-decoration: underline; }
.msg-unsupported { display: flex; align-items: center; gap: 6px; font-size: 13px; }

/* Overline: Anthropic Sans 10px */
.msg-time {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.5px;
  color: var(--color-stone-gray);
  margin-top: 4px;
  text-align: right;
}
</style>
