<!-- src/views/chat/Chat.vue -->
<template>
  <div class="chat-page">
    <el-container class="chat-container">
      <el-aside width="300px" class="chat-sidebar">
        <ConversationList />
      </el-aside>
      <el-main class="chat-main">
        <ChatWindow />
      </el-main>
    </el-container>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue';
import { useRoute } from 'vue-router';
import ConversationList from '@/components/chat/ConversationList.vue';
import ChatWindow from '@/components/chat/ChatWindow.vue';
import { useChatStore } from '@/store/modules/chat';

const chatStore = useChatStore();
const route = useRoute();

onMounted(() => {
  const userId = route.params.userId;
  if (userId && typeof userId === 'string') {
    chatStore.startAndSelectConversation(parseInt(userId, 10));
  }
});

onUnmounted(() => {
  chatStore.disconnect();
});
</script>

<style lang="scss" scoped>
.chat-page {
  padding: 20px;
  height: calc(100vh - 60px);
  background: var(--color-parchment);
}
.chat-container {
  height: 100%;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: rgba(0, 0, 0, 0.05) 0px 4px 24px;
}
.chat-sidebar {
  background: var(--color-ivory);
  border-right: 1px solid var(--color-border-cream);
}
.chat-main {
  background: var(--color-parchment);
  padding: 16px;
  display: flex;
  flex-direction: column;
}
</style>
