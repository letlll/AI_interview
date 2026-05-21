<!-- src/components/chat/ChatWindow.vue — Claude 三块布局 -->
<template>
  <div v-if="activeConversation" class="cw-root">
    <!-- 块 1：对话头部 -->
    <div class="cw-card cw-header">
      <el-avatar v-if="isAi" :size="40" class="ai-avatar">AI</el-avatar>
      <el-avatar v-else :size="40" :src="partner?.avatar || undefined" class="cw-avatar">
        {{ (partner?.username || '?').charAt(0).toUpperCase() }}
      </el-avatar>
      <div class="cw-header-text">
        <h2 class="cw-partner-name">{{ headerTitle }}</h2>
        <p class="cw-status">{{ headerSub }}</p>
      </div>
    </div>

    <!-- 块 2：消息区域 -->
    <div class="cw-card cw-messages">
      <el-scrollbar ref="scrollbarRef" class="cw-scroll">
        <MessageItem
          v-for="message in chatStore.activeMessages"
          :key="message.id"
          :message="message"
        />
        <div v-if="chatStore.otherUserTypingStatus" class="typing-hint">
          对方正在输入...
        </div>
      </el-scrollbar>
    </div>

  </div>

  <div v-else class="cw-empty">
    <p class="cw-empty-text">选择一个对话开始聊天</p>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick } from 'vue';
import { useChatStore } from '@/store/modules/chat';
import { useAuthStore } from '@/store/modules/auth';
import type { UserProfile } from '@/api/modules/user';
import MessageItem from './MessageItem.vue';
import type { ElScrollbar } from 'element-plus';

const chatStore = useChatStore();
const authStore = useAuthStore();
const scrollbarRef = ref<InstanceType<typeof ElScrollbar>>();

const activeConversation = computed(() => chatStore.activeConversation);
const isAi = computed(() => activeConversation.value?.conversation_type === 'user_ai');

const partner = computed<UserProfile | undefined>(() => {
  if (!authStore.user?.id || !activeConversation.value?.participants) return undefined;
  return activeConversation.value.participants.find(p => p.id !== authStore.user?.id);
});

const headerTitle = computed(() => {
  const conv = activeConversation.value;
  if (!conv) return '对话中...';
  if (isAi.value) {
    const rid = conv.resume_id ? ` #${conv.resume_id}` : '';
    return `${conv.resume_title || '未命名简历'}${rid}`;
  }
  return partner.value?.username || '对话中...';
});

const headerSub = computed(() => {
  if (isAi.value) return 'AI 简历对话';
  return chatStore.otherUserTypingStatus ? '正在输入...' : '在线';
});

watch(() => chatStore.activeMessages.length, () => {
  nextTick(() => {
    setTimeout(() => {
      scrollbarRef.value?.setScrollTop(scrollbarRef.value.wrapRef!.scrollHeight);
    }, 100);
  });
});
</script>

<style lang="scss" scoped>
/* ===== Root layout ===== */
.cw-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== Card — Contained (Level 1) + Whisper shadow (Level 3) ===== */
.cw-card {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  border-radius: 8px;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 4px 24px;
}

/* ===== Block 1 — Header ===== */
.cw-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 20px 24px;
  flex-shrink: 0;
}
.cw-header-text { flex: 1; }

/* Feature Title: Anthropic Serif 20.8px / 500 / 1.20 */
.cw-partner-name {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 20.8px;
  font-weight: 500;
  line-height: 1.20;
  color: var(--color-near-black);
  margin: 0;
}

/* Label: Anthropic Sans 12px / 400 / 1.25 / 0.12px */
.cw-status {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: 0.12px;
  color: var(--color-stone-gray);
  margin: 2px 0 0;
}

/* ===== Block 2 — Messages ===== */
.cw-messages {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.cw-scroll {
  flex: 1;
  padding: 8px 24px;
}

/* Claude scrollbar */
.cw-scroll::-webkit-scrollbar { width: 8px; }
.cw-scroll::-webkit-scrollbar-track { background: transparent; }
.cw-scroll::-webkit-scrollbar-thumb {
  background: var(--color-warm-silver);
  border-radius: 4px;
}
.cw-scroll::-webkit-scrollbar-thumb:hover { background: var(--color-stone-gray); }

/* Caption: Anthropic Sans 14px */
.typing-hint {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 14px;
  color: var(--color-stone-gray);
  padding: 4px 0 8px;
}

/* ===== Empty state ===== */
.cw-empty {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Body Small: Anthropic Sans 15px / 400 / 1.60 */
.cw-empty-text {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 15px;
  font-weight: 400;
  line-height: 1.60;
  color: var(--color-warm-silver);
}

/* Brand Terracotta avatar */
.ai-avatar {
  background: var(--color-terracotta) !important;
  color: var(--color-ivory) !important;
  font-weight: 500;
}
</style>
