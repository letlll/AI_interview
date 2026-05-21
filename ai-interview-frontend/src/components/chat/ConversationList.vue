<!-- src/components/chat/ConversationList.vue -->
<template>
  <div class="conv-list">
    <div class="conv-header">
      <h2 class="conv-title">对话列表</h2>
    </div>
    <el-scrollbar class="conv-scroll">
      <div v-if="conversations && conversations.length > 0">
        <div
          v-for="conv in conversations"
          :key="conv.id"
          class="conv-item"
          :class="{ active: conv.id === activeId }"
          @click="selectConv(conv.id)"
        >
          <el-avatar :size="40" :src="getAvatar(conv)" :class="{ 'ai-avatar': isAiConv(conv) }">
            {{ getInitials(conv) }}
          </el-avatar>
          <div class="conv-info">
            <div class="conv-row">
              <span class="conv-name">{{ getName(conv) }}</span>
              <span class="conv-time">{{ formatTime(conv.latest_message?.timestamp || '') }}</span>
            </div>
            <div class="conv-preview">{{ conv.latest_message?.content || '...' }}</div>
          </div>
          <el-badge :value="conv.unread_count" :hidden="!conv.unread_count" class="conv-badge" />
        </div>
      </div>
      <div v-else class="conv-empty">暂无对话</div>
    </el-scrollbar>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useChatStore } from '@/store/modules/chat';
import { useAuthStore } from '@/store/modules/auth';
import type { Conversation } from '@/api/modules/chat';
import { formatDateTime } from '@/utils/format';

const chatStore = useChatStore();
const authStore = useAuthStore();

const conversations = computed(() => {
  return chatStore.conversations
    .filter(c => c.latest_message != null)
    .sort((a, b) => new Date(b.latest_message!.timestamp).getTime() - new Date(a.latest_message!.timestamp).getTime());
});
const activeId = computed(() => chatStore.activeConversationId);
const currentUserId = computed(() => authStore.user?.id);

const getOtherParticipant = (conv: Conversation) => {
  if (!conv || !conv.participants || !currentUserId.value) return null;
  return conv.participants.find(p => p.id !== currentUserId.value);
};
const isAiConv = (conv: Conversation) => conv.conversation_type === 'user_ai';
const getAvatar = (conv: Conversation) => getOtherParticipant(conv)?.avatar || undefined;
const getInitials = (conv: Conversation) => {
  if (isAiConv(conv)) return 'AI';
  return (getOtherParticipant(conv)?.username || '?').charAt(0).toUpperCase();
};
const getName = (conv: Conversation) => {
  if (isAiConv(conv)) {
    const rid = conv.resume_id ? `#${conv.resume_id}` : '';
    const title = conv.resume_title || '未命名简历';
    return `简历 ${rid} ${title}`;
  }
  return getOtherParticipant(conv)?.username || '未知用户';
};
const formatTime = (time: string) => formatDateTime(time, 'MM-DD HH:mm');
const selectConv = (id: number) => chatStore.selectConversation(id);

onMounted(() => {
  chatStore.fetchConversations();
});
</script>

<style lang="scss" scoped>
.conv-list { height: 100%; display: flex; flex-direction: column; }

/* Header — Sub-heading Small: Serif 25.6px / 500 / 1.20 */
.conv-header {
  padding: 24px 20px;
  border-bottom: 1px solid var(--color-border-cream);
}
.conv-title {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 25.6px;
  font-weight: 500;
  line-height: 1.20;
  color: var(--color-near-black);
  margin: 0;
}

.conv-scroll { flex: 1; }

/* Claude scrollbar */
.conv-scroll::-webkit-scrollbar { width: 8px; }
.conv-scroll::-webkit-scrollbar-track { background: transparent; }
.conv-scroll::-webkit-scrollbar-thumb {
  background: var(--color-warm-silver);
  border-radius: 4px;
}
.conv-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-stone-gray); }

/* Item */
.conv-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 20px;
  cursor: pointer;
  border-bottom: 1px solid var(--color-border-cream);
  transition: background-color 0.15s;
}
.conv-item:hover { background-color: var(--color-parchment); }
.conv-item.active { background-color: var(--color-parchment); }
.conv-info { flex: 1; min-width: 0; }
.conv-row { display: flex; justify-content: space-between; align-items: baseline; }

/* Body Standard: Anthropic Sans 16px / 500 */
.conv-name {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 16px;
  font-weight: 500;
  line-height: 1.25;
  color: var(--color-near-black);
}

/* Label: Anthropic Sans 12px / 0.12px */
.conv-time {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.12px;
  color: var(--color-stone-gray);
  flex-shrink: 0;
  margin-left: 8px;
}

/* Caption: Anthropic Sans 14px / 400 / 1.43 */
.conv-preview {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  color: var(--color-stone-gray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 4px;
}

.conv-badge { flex-shrink: 0; }

/* Caption */
.conv-empty {
  font-family: var(--font-sans), Arial, sans-serif;
  text-align: center;
  color: var(--color-warm-silver);
  padding: 48px 0;
  font-size: 14px;
  line-height: 1.43;
}

.ai-avatar {
  background: var(--color-terracotta) !important;
  color: var(--color-ivory) !important;
  font-weight: 500;
}
</style>
