<template>
  <div class="ai-chat-panel">
    <!-- 对话消息列表 -->
    <div class="messages-container" ref="messagesContainer">
      <div
        v-for="(message, index) in messages"
        :key="index"
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
import { ref, nextTick, onMounted } from 'vue';
import { ChatDotRound, User, Plus, Edit, MagicStick, DocumentCopy } from '@element-plus/icons-vue';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

const emit = defineEmits<{
  (e: 'message-sent', message: string): void;
}>();

const messages = ref<Message[]>([
  {
    role: 'assistant',
    content: '你好！我是 AI 简历助手。我可以帮你：\n\n• 生成完整的简历内容\n• 优化现有的简历描述\n• 添加工作经历和项目经验\n• 提供专业的建议\n\n请告诉我你的需求，或使用下方的快捷指令开始！',
    timestamp: Date.now()
  }
]);

const userInput = ref('');
const isLoading = ref(false);
const messagesContainer = ref<HTMLElement>();

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
  messages.value.push({
    role: 'user',
    content: userInput.value,
    timestamp: Date.now()
  });

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

const addAssistantMessage = (content: string) => {
  messages.value.push({
    role: 'assistant',
    content,
    timestamp: Date.now()
  });
  scrollToBottom();
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
