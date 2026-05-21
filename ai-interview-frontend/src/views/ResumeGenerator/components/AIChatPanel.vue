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
        <button class="load-more-btn" @click="loadMoreMessages" :disabled="loadingMore">
          加载更多消息 ({{ remainingRounds }} 轮对话)
        </button>
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
          <div v-if="message.role === 'assistant'" class="avatar-circle avatar-ai">
            <img src="@/assets/images/image.svg" alt="AI" />
          </div>
          <div v-else class="avatar-circle avatar-user">
            <el-icon :size="18"><User /></el-icon>
          </div>
        </div>

        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">
              {{ message.role === 'assistant' ? 'AI 助手' : '我' }}
            </span>
            <span class="message-time">{{ formatTime(message.timestamp) }}</span>
          </div>
          <div class="message-text" :class="{ 'md-rendered': message.role === 'assistant' }">
            <template v-if="message.role === 'assistant'">
              <div class="chat-md-body" v-html="renderChatMarkdown(message.content)"></div>
            </template>
            <template v-else>
              {{ message.content }}
            </template>
          </div>
        </div>
      </div>

      <!-- 加载中提示 -->
      <div v-if="isLoading" class="message-item assistant">
        <div class="message-avatar">
          <div class="avatar-circle avatar-ai">
            <img src="@/assets/images/image.svg" alt="AI" />
          </div>
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

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- Slash 指令菜单 -->
      <div v-if="slashMenuOpen && filteredCommands.length > 0" class="slash-menu">
        <div class="slash-menu-header">
          <span class="slash-menu-category">{{ activeCategory }}</span>
        </div>
        <div
          v-for="(cmd, index) in filteredCommands"
          :key="cmd.id"
          class="slash-menu-item"
          :class="{ 'is-selected': index === selectedIdx }"
          @click="selectCommand(cmd)"
          @mouseenter="selectedIdx = index"
        >
          <el-icon :size="16"><component :is="cmd.icon" /></el-icon>
          <div class="slash-menu-body">
            <span class="slash-menu-label">{{ cmd.label }}</span>
            <span class="slash-menu-desc">{{ cmd.description }}</span>
          </div>
          <kbd class="slash-menu-cmd">{{ cmd.command }}</kbd>
        </div>
        <div class="slash-menu-footer">
          <kbd>&#8593; &#8595;</kbd> 导航
          <kbd>Enter</kbd> 选择
          <kbd>Esc</kbd> 关闭
        </div>
      </div>

      <!-- 输入框 -->
      <div class="input-container">
        <el-input
          ref="inputRef"
          v-model="userInput"
          type="textarea"
          :rows="3"
          :placeholder="slashMenuOpen ? '输入关键词筛选指令...' : '告诉 AI 你的需求，输入 / 使用快捷指令...'"
          @keydown="handleKeyDown"
          :disabled="isLoading"
          class="chat-textarea"
          :autosize="false"
        />
        <div class="input-actions">
          <span class="input-tip">输入 <kbd class="tip-kbd">/</kbd> 查看指令，Enter 发送，Ctrl+Enter 换行</span>
          <button class="send-btn" @click="handleSend" :disabled="isLoading || !userInput.trim()">
            <template v-if="isLoading">
              <el-icon class="is-loading"><Loading /></el-icon>
            </template>
            发送
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue';
import { User, Plus, Edit, MagicStick, DocumentCopy, Loading, Collection, Brush } from '@element-plus/icons-vue';
import { renderChatMarkdown } from '@/composables/useChatMarkdown';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SlashCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  icon: any;
  category: string;
  prompt: string;
}

const emit = defineEmits<{
  (e: 'message-sent', message: string): void;
}>();

// 分页配置
const INITIAL_ROUNDS = 3;
const LOAD_MORE_ROUNDS = 5;

// 欢迎消息（不计入历史消息）
const welcomeMessage: Message = {
  role: 'assistant',
  content: '你好！我是 AI 简历助手。我可以帮你：\n\n• 生成完整的简历内容\n• 优化现有的简历描述\n• 添加工作经历和项目经验\n• **调整样式**：修改主题颜色、字体、布局等\n• 提供专业的建议\n\n输入 **/** 查看所有快捷指令，或直接告诉我你的需求！',
  timestamp: Date.now()
};

// 分页状态
const allMessages = ref<Message[]>([]);
const displayStartIndex = ref(0);
const hasMoreMessages = computed(() => allMessages.value.length > displayStartIndex.value);
const remainingRounds = computed(() => Math.ceil((allMessages.value.length - displayStartIndex.value) / 2));
const displayedMessages = computed(() => {
  if (allMessages.value.length === 0) return [welcomeMessage];
  return allMessages.value.slice(displayStartIndex.value);
});
const loadingMore = ref(false);

// 滚动状态
const isAtBottom = ref(true);
const messagesContainer = ref<HTMLElement>();
const userScrolledUp = ref(false);

// 用户输入和加载状态
const userInput = ref('');
const isLoading = ref(false);
const inputRef = ref<any>();

// ===== Slash 指令系统 =====
const slashCommands: SlashCommand[] = [
  {
    id: 'generate',
    command: '/generate',
    label: '生成完整简历',
    description: '根据目标岗位生成完整简历，包含个人信息、教育背景、工作经历、项目经验、技能特长和求职意向',
    icon: Plus,
    category: '内容生成',
    prompt: '请帮我生成一份完整的简历。\n\n目标岗位：[请填写具体岗位名称]\n工作年限：[请填写年限]\n行业方向：[请填写行业]\n\n要求：\n1. 个人信息模块（姓名、联系方式、求职意向）\n2. 教育背景（学校、专业、学位、时间）\n3. 3-5段相关工作经历（使用STAR法则：情境-任务-行动-结果）\n4. 2-3个重点项目经验（包含技术栈、职责、量化成果）\n5. 技能特长（按类别分组，标注熟练程度）\n6. 个人总结（3-4句话突出核心竞争力）'
  },
  {
    id: 'work',
    command: '/work',
    label: '添加工作经历',
    description: '使用STAR法则添加一段工作经历，突出量化成果、关键绩效指标和专业能力',
    icon: DocumentCopy,
    category: '内容生成',
    prompt: '请帮我添加一段工作经历。\n\n公司名称：[公司名称]\n职位：[职位名称]\n工作时间：[起始年月 - 结束年月]\n行业：[行业类型]\n\n要求：\n1. 使用STAR法则结构（情境-任务-行动-结果）\n2. 每段描述包含具体数据和量化指标\n3. 突出个人贡献而非团队描述\n4. 使用专业动词（主导、设计、优化、提升等）\n5. 3-5个要点，每个不超过两行'
  },
  {
    id: 'project',
    command: '/project',
    label: '添加项目经验',
    description: '添加完整的项目经验，包含背景、技术栈、个人职责、量化成果和技术亮点',
    icon: Edit,
    category: '内容生成',
    prompt: '请帮我添加一个项目经验。\n\n项目名称：[项目名称]\n项目时间：[起始 - 结束]\n技术栈：[使用的技术/框架/工具]\n项目类型：[Web应用/小程序/数据平台等]\n\n要求：\n1. 项目背景和业务目标（1-2句话）\n2. 我的角色和核心职责\n3. 技术架构和关键设计决策\n4. 遇到的难点和解决方案\n5. 项目成果和量化指标（用户量、性能提升、收入增长等）'
  },
  {
    id: 'skills',
    command: '/skills',
    label: '管理技能特长',
    description: '按类别整理和优化技能特长，标注熟练程度，突出与目标岗位匹配的关键技能',
    icon: Collection,
    category: '内容生成',
    prompt: '请帮我整理技能特长部分。\n\n目标岗位：[岗位名称]\n\n要求：\n1. 按类别分组：编程语言 / 框架与库 / 工具与平台 / 数据库 / 云服务 / 软技能\n2. 每项标注熟练程度（精通/熟练/了解）\n3. 将与目标岗位最匹配的技能排在前面\n4. 补充相关认证和培训经历\n5. 列出技术社区贡献（如有）'
  },
  {
    id: 'summary',
    command: '/summary',
    label: '撰写个人总结',
    description: '生成专业的个人总结/求职意向，3-4句话突出核心竞争力、职业定位和发展目标',
    icon: User,
    category: '内容生成',
    prompt: '请帮我撰写个人总结/求职意向。\n\n目标岗位：[岗位名称]\n核心优势：[你的核心优势，如技术深度、管理经验等]\n职业方向：[职业发展方向]\n\n要求：\n1. 3-4句话，简明有力，控制在100字以内\n2. 第一句：专业定位（X年经验的XX工程师/设计师）\n3. 第二句：核心竞争力（最突出的能力和成就）\n4. 第三句：职业目标（希望创造什么价值）\n5. 使用主动语态，避免空洞形容词'
  },
  {
    id: 'optimize',
    command: '/optimize',
    label: '优化简历描述',
    description: '使用STAR法则和量化表达优化现有简历中的描述，提升专业度和可读性',
    icon: MagicStick,
    category: '内容优化',
    prompt: '请帮我优化以下简历描述。\n\n要求：\n1. 使用STAR法则重新组织每段经历\n2. 补充量化数据和具体成果（如百分比、金额、用户数等）\n3. 使用更专业、更有力的动词（主导、推动、设计、实现、优化）\n4. 去除冗余、空洞和重复的描述\n5. 突出个人贡献和影响力，而非团队整体\n6. 每段控制在2-3行，保持信息密度\n7. 统一时态和语法风格'
  },
  {
    id: 'style',
    command: '/style',
    label: '修改视觉样式',
    description: '调整简历的主题配色、字体风格、布局方式、间距边距等视觉呈现',
    icon: Brush,
    category: '样式调整',
    prompt: '请帮我修改简历的视觉样式。\n\n当前可调整的方面：\n1. 主题配色：选择配色方案（商务蓝/现代紫/经典黑白/暖色调等）或自定义主色\n2. 字体风格：标题字体和正文字体的选择与大小\n3. 布局方式：单栏/双栏、模块排列顺序\n4. 间距密度：紧凑型/适中型/宽松型\n5. 模块样式：各模块的标题样式、边框、背景色\n6. 其他需求：[请补充说明]\n\n请描述你想要的风格，我会同时修改 themeStyles 和 customStyles。'
  }
];

const slashMenuOpen = ref(false);
const selectedIdx = ref(0);
const slashFilter = ref('');

const slashState = computed(() => {
  const text = userInput.value;
  // 找到最后一个 /，要求: 行首 或 前面是空格
  const re = /(?:^|\s)\/([^\s/]*)$/;
  const match = text.match(re);
  if (!match) return { active: false, filter: '', startIdx: -1 };
  return { active: true, filter: match[1], startIdx: text.lastIndexOf('/' + match[1]) };
});

const filteredCommands = computed(() => {
  const f = slashState.value.filter.toLowerCase();
  if (!f) return slashCommands;
  return slashCommands.filter(
    c => c.command.toLowerCase().includes(f) ||
         c.label.toLowerCase().includes(f) ||
         c.description.toLowerCase().includes(f)
  );
});

const activeCategory = computed(() => {
  const first = filteredCommands.value[0];
  return first ? first.category : '';
});

const selectCommand = (cmd: SlashCommand) => {
  const before = userInput.value.slice(0, slashState.value.startIdx);
  const after = userInput.value.slice(slashState.value.startIdx + 1 + slashState.value.filter.length);
  userInput.value = before + cmd.prompt + after;
  slashMenuOpen.value = false;
  selectedIdx.value = 0;
  inputRef.value?.focus();
};

const handleKeyDown = (e: KeyboardEvent) => {
  // slash 菜单打开时的键盘处理
  if (slashMenuOpen.value) {
    const cmds = filteredCommands.value;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIdx.value = (selectedIdx.value + 1) % cmds.length;
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIdx.value = (selectedIdx.value - 1 + cmds.length) % cmds.length;
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (cmds[selectedIdx.value]) {
        selectCommand(cmds[selectedIdx.value]);
      }
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      slashMenuOpen.value = false;
      selectedIdx.value = 0;
      return;
    }
    // 其他键 — 让 v-model 更新，watch 会更新过滤
    return;
  }

  // 正常输入时的 Enter 处理
  if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
    e.preventDefault();
    handleSend();
  }
};

// 监听用户输入变化，检测 / 触发
watch(() => userInput.value, () => {
  const st = slashState.value;
  if (st.active) {
    slashMenuOpen.value = true;
    slashFilter.value = st.filter;
    selectedIdx.value = 0;
  } else {
    slashMenuOpen.value = false;
    slashFilter.value = '';
    selectedIdx.value = 0;
  }
});

const handleSend = () => {
  if (!userInput.value.trim() || isLoading.value) return;

  allMessages.value.push({
    role: 'user',
    content: userInput.value,
    timestamp: Date.now()
  });

  if (displayStartIndex.value < allMessages.value.length) {
    displayStartIndex.value = allMessages.value.length;
  }

  emit('message-sent', userInput.value);

  userInput.value = '';
  scrollToBottom();
};

// 加载更多消息
const loadMoreMessages = () => {
  if (loadingMore.value || !hasMoreMessages.value) return;

  loadingMore.value = true;

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
  const nowAtBottom = scrollHeight - scrollTop - clientHeight < 50;
  if (nowAtBottom) {
    isAtBottom.value = true;
    userScrolledUp.value = false;
  } else {
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
  },
  refresh: () => {
    allMessages.value = [];
    displayStartIndex.value = 0;
    userScrolledUp.value = false;
    isLoading.value = false;
    nextTick(() => scrollToBottom());
  }
});

onMounted(() => {
  scrollToBottom();
});
</script>

<style scoped lang="scss">
/* ===== Root panel — Ivory surface ===== */
.ai-chat-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-ivory);
}

/* ===== Avatar ===== */
.avatar-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
}

.avatar-ai {
  background: var(--color-ivory);
  border: 1px solid var(--color-border-cream);
  img { width: 100%; height: 100%; object-fit: cover; }
}

.avatar-user {
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
}

/* ===== Messages area ===== */
.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 24px;

  &::-webkit-scrollbar { width: 8px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-warm-silver);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb:hover { background: var(--color-stone-gray); }
}

/* ===== Load more ===== */
.load-more-container {
  display: flex;
  justify-content: center;
  padding: 8px 0 16px;
}

.load-more-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
  border: none;
  padding: 6px 16px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1.60;
  letter-spacing: 0.12px;
  cursor: pointer;
  box-shadow: var(--color-warm-sand) 0px 0px 0px 0px, var(--color-ring-warm) 0px 0px 0px 1px;
  transition: box-shadow 0.2s, background 0.2s;
  &:hover { background: #dedcd0; }
  &:active { box-shadow: inset 0px 0px 0px 1px rgba(0,0,0,0.15); }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.load-more-loading {
  font-family: var(--font-sans), Arial, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  color: var(--color-stone-gray);
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
}

/* ===== Message item ===== */
.message-item {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;

  &.assistant {
    .message-text {
      background: var(--color-parchment);
      color: var(--color-near-black);
    }
  }

  &.user {
    flex-direction: row-reverse;

    .message-content { align-items: flex-end; }

    .message-text {
      background: var(--color-terracotta);
      color: var(--color-ivory);
    }
  }
}

.message-avatar { flex-shrink: 0; }

.message-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
  max-width: 70%;
}

.message-header {
  font-family: var(--font-sans), Arial, sans-serif;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  font-weight: 400;
  line-height: 1.25;
  letter-spacing: 0.12px;
  color: var(--color-stone-gray);
}

.message-sender { font-weight: 500; }

.message-text {
  font-family: var(--font-sans), Arial, sans-serif;
  padding: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  white-space: pre-wrap;
  word-break: break-word;
  -webkit-user-select: text;
  user-select: text;
}

/* ===== Markdown body ===== */
.chat-md-body {
  p { margin: 0 0 8px; line-height: 1.60; &:last-child { margin-bottom: 0; } }
  ul, ol { padding-left: 20px; margin: 0 0 8px; }
  li { margin-bottom: 4px; line-height: 1.60; }

  h1 { font-family: var(--font-sans), Arial, sans-serif; font-size: 16px; font-weight: 500; margin: 0 0 8px; }
  h2 { font-family: var(--font-sans), Arial, sans-serif; font-size: 15px; font-weight: 500; margin: 0 0 8px; }
  h3 { font-family: var(--font-sans), Arial, sans-serif; font-size: 14px; font-weight: 500; margin: 0 0 8px; }
  h4, h5, h6 { display: none; }

  pre {
    background: var(--color-near-black);
    border-radius: 8px;
    padding: 12px 16px;
    overflow-x: auto;
    margin: 0 0 8px;
    font-size: 13px;
    color: var(--color-warm-silver);
  }
  pre code { background: none; padding: 0; color: inherit; }
  code:not(pre code) {
    background: rgba(0, 0, 0, 0.08);
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 13px;
    color: var(--color-near-black);
  }

  table { border-collapse: collapse; width: 100%; margin: 0 0 8px; font-size: 13px; }
  th, td { border: 1px solid var(--color-border-cream); padding: 6px 10px; }
  th { background: var(--color-parchment); font-weight: 500; }
  blockquote {
    border-left: 3px solid var(--color-terracotta);
    margin: 0 0 8px;
    padding: 4px 12px;
    color: var(--color-stone-gray);
    font-size: 14px;
  }
  hr { border: none; border-top: 1px solid var(--color-border-cream); margin: 10px 0; }
  a { color: var(--color-terracotta); }

  // Override global * { user-select: none } — v-html children don't inherit .message-text
  :deep(*) {
    -webkit-user-select: text;
    user-select: text;
  }
}

/* ===== Typing indicator ===== */
.typing-indicator {
  display: flex;
  gap: 4px;
  padding: 12px 16px;
  background: var(--color-parchment);
  border-radius: 8px;

  span {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color-terracotta);
    animation: typing 1.4s infinite;
    &:nth-child(2) { animation-delay: 0.2s; }
    &:nth-child(3) { animation-delay: 0.4s; }
  }
}

@keyframes typing {
  0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
  30% { opacity: 1; transform: translateY(-10px); }
}

/* ===== Input area wrapper ===== */
.input-area {
  position: relative;
  z-index: 10;
}

/* ===== Slash command menu ===== */
.slash-menu {
  position: absolute;
  bottom: 100%;
  left: 24px;
  right: 24px;
  margin-bottom: 6px;
  max-height: 340px;
  overflow-y: auto;
  background: var(--color-ivory);
  border: 1px solid var(--color-border-warm);
  border-radius: 12px;
  box-shadow: rgba(0,0,0,0.08) 0px 4px 16px;
  padding: 6px;
  z-index: 20;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-warm-silver);
    border-radius: 3px;
  }
}

.slash-menu-header {
  padding: 6px 10px 4px;
}

.slash-menu-category {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 10px;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--color-terracotta);
}

.slash-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.1s;

  &.is-selected {
    background: var(--color-parchment);
  }

  .el-icon {
    flex-shrink: 0;
    color: var(--color-stone-gray);
  }

  &.is-selected .el-icon {
    color: var(--color-terracotta);
  }
}

.slash-menu-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.slash-menu-label {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 13px;
  font-weight: 500;
  line-height: 1.40;
  color: var(--color-near-black);
}

.slash-menu-desc {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 11px;
  font-weight: 400;
  line-height: 1.40;
  color: var(--color-stone-gray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Caption: Anthropic Sans 11px */
.slash-menu-cmd {
  font-family: var(--font-mono), SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 400;
  color: var(--color-warm-silver);
  background: var(--color-parchment);
  padding: 2px 6px;
  border-radius: 4px;
  flex-shrink: 0;
}

.slash-menu-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px 4px;
  border-top: 1px solid var(--color-border-cream);
  margin-top: 2px;

  kbd {
    font-family: var(--font-mono), SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 10px;
    color: var(--color-stone-gray);
    background: var(--color-parchment);
    padding: 1px 5px;
    border-radius: 3px;
  }

  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 10px;
  color: var(--color-warm-silver);
}

/* ===== Input container ===== */
.input-container {
  padding: 16px 24px;
  border-top: 1px solid var(--color-border-cream);
  background: var(--color-ivory);
}

.chat-textarea :deep(textarea) {
  font-family: var(--font-sans), Arial, sans-serif;
  background: var(--color-ivory);
  color: var(--color-near-black);
  border: 1px solid var(--color-border-warm);
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.60;
  resize: none;
  transition: border-color 0.2s, box-shadow 0.2s;
  &::placeholder { color: var(--color-warm-silver); }
  &:focus {
    border-color: var(--color-focus-blue);
    outline: none;
    box-shadow: 0 0 0 1px var(--color-focus-blue);
  }
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}

.input-tip {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.12px;
  color: var(--color-stone-gray);
  display: flex;
  align-items: center;
  gap: 4px;
}

.tip-kbd {
  font-family: var(--font-mono), SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 4px;
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
  font-size: 12px;
  font-weight: 500;
}

/* Terracotta Brand CTA button */
.send-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--color-terracotta);
  color: var(--color-ivory);
  border: none;
  padding: 8px 20px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 500;
  line-height: 1.25;
  cursor: pointer;
  box-shadow: var(--color-terracotta) 0px 0px 0px 0px, var(--color-terracotta) 0px 0px 0px 1px;
  transition: background 0.2s, opacity 0.2s;
  &:hover { background: #d97757; }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    &:hover { background: var(--color-terracotta); }
  }
}
</style>
