<template>
  <div class="ai-chat-panel">
    <!-- 对话消息列表 -->
    <div
      class="messages-container"
      ref="messagesContainer"
      @scroll="handleScroll"
    >
      <!-- 加载更多按钮 -->
      <div v-if="hasMoreMessages && !loadingMore" class="load-more-container">
        <el-button size="small" @click="loadMoreMessages" :loading="loadingMore">
          加载更多消息 ({{ remainingRounds }} 轮对话)
        </el-button>
      </div>
      <div v-if="loadingMore" class="load-more-loading">
        <el-icon class="is-loading"><Loading /></el-icon>
        加载中...
      </div>

      <div
        v-for="(message, index) in displayedMessages"
        :key="`${message.timestamp}-${index}`"
        class="message-item"
        :class="message.role"
      >
        <div class="message-avatar">
          <el-avatar :size="36">
            <el-icon v-if="message.role === 'assistant'">
              <ChatDotRound />
            </el-icon>
            <el-icon v-else>
              <User />
            </el-icon>
          </el-avatar>
        </div>

        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">
              {{ message.role === 'assistant' ? 'AI 助手' : '我' }}
            </span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text">{{ message.content }}</div>
        </div>
      </div>

      <!-- 加载中提示 -->
      <div v-if="isLoading" class="message-item assistant">
        <div class="message-avatar">
          <el-avatar :size="36">
            <el-icon><ChatDotRound /></el-icon>
          </el-avatar>
        </div>
        <div class="message-content">
          <div class="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </div>

    <!-- 快捷指令 -->
    <div class="quick-actions" v-if="!isLoading">
      <div class="quick-actions-title">快捷指令</div>
      <div class="quick-actions-list">
        <el-button
          v-for="action in quickActions"
          :key="action.id"
          size="small"
          @click="handleQuickAction(action.prompt)"
        >
          <el-icon><component :is="action.icon" /></el-icon>
          {{ action.label }}
        </el-button>
      </div>
    </div>

    <!-- 输入框 -->
    <div class="input-container">
      <el-input
        v-model="userInput"
        type="textarea"
        :rows="3"
        placeholder="告诉 AI 你的需求，例如：帮我生成一份前端工程师的简历..."
        @keydown.enter.ctrl="handleSend"
        :disabled="isLoading"
      />
      <div class="input-actions">
        <span class="input-tip">Ctrl + Enter 发送</span>
        <el-button type="primary" @click="handleSend" :loading="isLoading">
          发送
        </el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue';
import { ChatDotRound, User, Plus, Edit, MagicStick, DocumentCopy, Loading } from '@element-plus/icons-vue';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const emit = defineEmits<{
  (e: 'message-sent', message: string): void;
}>();

// 分页配置
const INITIAL_ROUNDS = 3;       // 初始显示轮数
const LOAD_MORE_ROUNDS = 5;     // 每次加载更多轮数

// 欢迎消息（不计入历史消息）
const welcomeMessage: Message = {
  role: 'assistant',
  content: '你好！我是 AI 简历助手。我可以帮你：\n\n• 生成完整的简历内容\n• 优化现有的简历描述\n• 添加工作经历和项目经验\n• 提供专业的建议\n\n请告诉我你的需求，或使用下方的快捷指令开始！',
  timestamp: Date.now()
};

// 分页状态
const allMessages = ref<Message[]>([]);      // 完整消息列表
const displayStartIndex = ref(0);                  // 当前显示的消息数
// 分页计算属性
const hasMoreMessages = computed(() => allMessages.value.length > displayStartIndex.value);
const remainingRounds = computed(() => Math.ceil((allMessages.value.length - displayStartIndex.value) / 2));
// 显示的消息 = 欢迎消息 + 从 displayStartIndex 到末尾的所有消息（即最新的部分）
const displayedMessages = computed(() => [welcomeMessage, ...allMessages.value.slice(displayStartIndex.value)]);
const loadingMore = ref(false);

// 滚动状态
const isAtBottom = ref(true);
const messagesContainer = ref<HTMLElement>();
const userScrolledUp = ref(false);

// 用户输入和加载状态
const userInput = ref('');
const isLoading = ref(false);

const quickActions = [
  {
    id: 'generate',
    label: '生成简历',
    icon: Plus,
    prompt: '帮我生成一份完整的简历'
  },
  {
    id: 'add-work',
    label: '添加工作经历',
    icon: DocumentCopy,
    prompt: '帮我添加一段工作经历'
  },
  {
    id: 'optimize',
    label: '优化描述',
    icon: MagicStick,
    prompt: '帮我优化简历中的描述'
  },
  {
    id: 'add-project',
    label: '添加项目经验',
    icon: Edit,
    prompt: '帮我添加一个项目经验'
  }
];

const handleSend = () => {
  if (!userInput.value.trim() || isLoading.value) return;

  // 添加用户消息
  allMessages.value.push({
    role: 'user',
    content: userInput.value,
    timestamp: Date.now()
  });

  // 确保新消息在显示范围内
  if (displayStartIndex.value < allMessages.value.length) {
    displayStartIndex.value = allMessages.value.length;
  }

  // 发送给父组件处理
  emit('message-sent', userInput.value);

  // 清空输入
  userInput.value = '';

  // 滚动到底部
  scrollToBottom();
};

const handleQuickAction = (prompt: string) => {
  userInput.value = prompt;
  handleSend();
};

// 加载更多消息
const loadMoreMessages = () => {
  if (loadingMore.value || !hasMoreMessages.value) return;

  loadingMore.value = true;

  // 保存当前滚动高度
  const oldScrollHeight = messagesContainer.value?.scrollHeight || 0;

  setTimeout(() => {
    displayStartIndex.value = Math.max(
      0,
      displayStartIndex.value - LOAD_MORE_ROUNDS * 2
    );
    loadingMore.value = false;
  }, 300);
};

// 滚动事件处理
const handleScroll = () => {
  if (!messagesContainer.value) return;
  const { scrollTop, scrollHeight, clientHeight } = messagesContainer.value;

  // 判断是否在底部（阈值50px）
  const nowAtBottom = scrollHeight - scrollTop - clientHeight < 50;

  // 如果用户在底部，自动滚动新消息
  if (nowAtBottom) {
    isAtBottom.value = true;
    userScrolledUp.value = false;
  } else {
    // 用户主动上滑
    isAtBottom.value = false;
    userScrolledUp.value = true;
  }
};

const addAssistantMessage = (content: string) => {
  allMessages.value.push({
    role: 'assistant',
    content,
    timestamp: Date.now()
  });
  // 如果用户没有主动上滑，自动滚动到底部
  if (isAtBottom.value || !userScrolledUp.value) {
    scrollToBottom();
  }
};

const scrollToBottom = () => {
  nextTick(() => {
    if (messagesContainer.value) {
      messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight;
    }
  });
};

const formatTime = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
};

// 暴露方法给父组件
defineExpose({
  addAssistantMessage,
  setLoading: (loading: boolean) => {
    isLoading.value = loading;
    scrollToBottom();
  },
  setMessages: (msgs: Message[]) => {
    allMessages.value = msgs.sort((a, b) => a.timestamp - b.timestamp);
    displayStartIndex.value = Math.max(0, msgs.length - INITIAL_ROUNDS * 2);
    userScrolledUp.value = false;
    nextTick(() => scrollToBottom());
  }
});

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped lang="scss">
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--el-bg-color);
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;

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

// 加载更多区域
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 12px;
  margin-bottom: 16px;
}

.load-more-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: var(--el-text-color-secondary);
  font-size: 14px;
}

.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  
  &.user {
    flex-direction: row-reverse;
    
    .message-content {
      align-items: flex-end;
    }
    
    .message-text {
      background: var(--el-color-primary-light-9);
      color: var(--el-text-color-primary);
    }
  }
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-sender {
  font-weight: 500;
}

.message-text {
  padding: 12px 16px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
  color: var(--el-text-color-primary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  
  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--el-color-primary);
    animation: typing 1.4s infinite;
    
    &:nth-child(2) {
      animation-delay: 0.2s;
    }
    
    &:nth-child(3) {
      animation-delay: 0.4s;
    }
  }
}

@keyframes typing {
  0%, 60%, 100% {
    opacity: 0.3;
    transform: translateY(0);
  }
  30% {
    opacity: 1;
    transform: translateY(-10px);
  }
}

.quick-actions {
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color-lighter);
  background: var(--el-fill-color-lighter);
}

.quick-actions-title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}

.quick-actions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.input-container {
  padding: 16px 20px;
  border-top: 1px solid var(--el-border-color);
  background: var(--el-bg-color);
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}

.input-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
