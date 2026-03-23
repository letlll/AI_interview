/**
 * 简历 AI 助手 - 智能 Prompt 构建与意图识别
 * 实现 Token 优化和上下文压缩
 *
 * 极简 Schema：所有内容存在 content（完整 Markdown），history 存对话历史
 */

import { cloneDeep } from 'lodash-es';

// ==================== 类型定义 ====================

export interface UserIntent {
  type: 'create' | 'modify' | 'optimize' | 'add' | 'delete' | 'query';
  target?: string;
  action?: string;
  confidence: number;
}

export interface ResumeDigest {
  profile: {
    name: string;
    position: string;
    yearsOfExperience: number;
  };
  stats: {
    workCount: number;
    projectCount: number;
    educationCount: number;
  };
  keywords: string[];
  focusArea?: {
    path: string;
    content: string;
  };
}

export interface UpdateInstruction {
  action: 'add' | 'update' | 'delete' | 'replace';
  path: string;
  value?: any;
  reason?: string;
}

export interface AIResponse {
  instructions: UpdateInstruction[];
  message: string;
  confidence?: number;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  intent?: UserIntent;
}

// 极简版 ResumeData：整个简历就是一个 Markdown 字符串
export interface ResumeData {
  /** 完整的 Markdown 内容（包含姓名、各区块等所有内容） */
  content?: string;
  /** AI 多轮对话历史 */
  history?: Message[];
}

// ==================== 意图识别 ====================

export function detectIntent(message: string, lastEditedField?: string): UserIntent {
  const patterns = {
    create: /生成|创建|新建|帮我写|制作/,
    modify: /修改|更改|改成|换成|调整/,
    optimize: /优化|改进|提升|润色|完善|美化/,
    add: /添加|增加|加上|补充|再加/,
    delete: /删除|移除|去掉|删掉/,
    query: /怎么|如何|什么|为什么|可以吗/
  };

  let intentType: UserIntent['type'] = 'query';
  let confidence = 0.5;

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      intentType = type as UserIntent['type'];
      confidence = 0.8;
      break;
    }
  }

  const target = extractTarget(message, lastEditedField);

  return { type: intentType, target, confidence };
}

function extractTarget(message: string, lastEditedField?: string): string | undefined {
  const targetPatterns: Record<string, RegExp> = {
    workExperience: /工作经历|工作经验|工作|经历/,
    projects: /项目经验|项目|project/,
    skills: /技能|专业技能|skill/,
    education: /教育|学历|教育背景/,
    basicInfo: /基本信息|个人信息|联系方式/
  };

  for (const [target, pattern] of Object.entries(targetPatterns)) {
    if (pattern.test(message)) {
      const indexMatch = message.match(/第(\d+)个|第(\d+)条/);
      if (indexMatch) {
        const index = parseInt(indexMatch[1] || indexMatch[2]) - 1;
        return `${target}.${index}`;
      }
      return target;
    }
  }

  return lastEditedField;
}

// ==================== 简历数据压缩 ====================

export function digestResume(resume: ResumeData, focusPath?: string): ResumeDigest {
  const content = resume.content || '';

  return {
    profile: {
      name: extractName(content),
      position: extractPosition(content),
      yearsOfExperience: extractWorkYears(content)
    },
    stats: {
      workCount: countSections(content, '工作'),
      projectCount: countSections(content, '项目'),
      educationCount: countSections(content, '教育')
    },
    keywords: extractKeywords(content, 15),
    focusArea: focusPath ? { path: focusPath, content: resume.content || '' } : undefined
  };
}

function extractName(content: string): string {
  const m = content.match(/^#\s+(.+)/m);
  return m ? m[1].trim() : '未填写';
}

function extractPosition(content: string): string {
  const m = content.match(/(?:岗位|职位|求职意向)[：:]\s*(.+)/i);
  if (m) return m[1].trim();
  const m2 = content.match(/\*\*([^*]+)\*\*[\s\S]{0,50}工程师|开发/);
  return (m2 && m2[1]) ? m2[1].trim() : '未指定';
}

function countSections(content: string, prefix: string): number {
  if (!content) return 0;
  const regex = new RegExp(`^##\\s+.+${prefix}`, 'gm');
  return (content.match(regex) || []).length;
}

function extractWorkYears(content: string): number {
  if (!content) return 0;
  const years = content.match(/(\d{4})\s*[-~]\s*(\d{4}|今|现在)/g);
  if (!years) return 0;
  const currentYear = new Date().getFullYear();
  let maxYears = 0;
  for (const y of years) {
    const match = y.match(/(\d{4})/g);
    if (match && match.length === 2) {
      const end = match[1] === '今' || match[1] === '现在' ? currentYear : parseInt(match[1]);
      maxYears = Math.max(maxYears, end - parseInt(match[0]));
    }
  }
  return Math.min(maxYears, 10);
}

function extractKeywords(content: string, topN: number): string[] {
  const words = content.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g) || [];
  const freq: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 1 && !isCommonWord(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function isCommonWord(word: string): boolean {
  const common = ['的', '了', '在', '是', '和', '有', '为', '等', 'the', 'and', 'or'];
  return common.includes(word.toLowerCase());
}

function getFocusContent(resume: ResumeData, focusPath: string): string {
  if (focusPath === 'content') return resume.content || '';
  return '';
}

// ==================== 对话历史压缩 ====================

export function compressHistory(messages: Message[], currentIntent: UserIntent) {
  return {
    recentMessages: messages.slice(-4),
    relevantMessages: filterRelevantMessages(messages.slice(0, -4), currentIntent, 2),
    earlySummary: summarizeEarlyMessages(messages.slice(0, -8))
  };
}

function filterRelevantMessages(messages: Message[], intent: UserIntent, topK: number): Message[] {
  if (messages.length === 0) return [];

  const scored = messages.map(msg => ({ message: msg, score: calculateRelevance(msg, intent) }));
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.message)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function calculateRelevance(message: Message, intent: UserIntent): number {
  let score = 0;

  if (intent.target && message.content.includes(intent.target)) score += 0.5;

  const intentKeywords: Record<string, string[]> = {
    optimize: ['优化', '改进', '提升'],
    add: ['添加', '增加', '补充'],
    modify: ['修改', '更改', '调整']
  };

  const keywords = intentKeywords[intent.type] || [];
  if (keywords.some(kw => message.content.includes(kw))) score += 0.3;

  const ageMinutes = (Date.now() - message.timestamp) / (1000 * 60);
  score *= Math.exp(-ageMinutes / 10);

  return score;
}

function summarizeEarlyMessages(messages: Message[]): string {
  if (messages.length === 0) return '';

  const userActions = messages
    .filter(m => m.role === 'user')
    .map(m => {
      if (m.content.includes('生成')) return '生成简历';
      if (m.content.includes('修改')) return '修改内容';
      if (m.content.includes('添加')) return '添加信息';
      return '其他操作';
    });

  return `早期操作：${userActions.join('、')}`;
}

// ==================== Prompt 构建器 ====================

export function buildOptimizedPrompt(
  userMessage: string,
  resumeData: ResumeData,
  chatHistory: Message[],
  lastEditedField?: string,
  internalMarkdown?: string
): string {
  const intent = detectIntent(userMessage, lastEditedField);
  const digest = digestResume(resumeData, intent.target);
  const memory = compressHistory(chatHistory, intent);

  return assemblePrompt({ intent, digest, memory, userMessage, resumeData, internalMarkdown });
}

function buildFullResumeContent(resume: ResumeData, rawMarkdown: string | undefined, maxTokens: number): string {
  const md = (rawMarkdown?.trim() || resume.content || '')
    .replace(/<!--\s*section:[\w-]+:.+?\s*-->/g, '');

  const tokens = md.length / 4;
  if (tokens > maxTokens) {
    return md.slice(0, maxTokens * 4) + '\n...（内容已截断）';
  }
  return md || '（简历为空）';
}

function buildFallbackContent(resume: ResumeData): string {
  const parts: string[] = [];
  if (resume.content) parts.push('【简历内容】\n' + resume.content);

  return parts.join('\n\n') || '（简历为空）';
}

function assemblePrompt(parts: {
  intent: UserIntent;
  digest: ResumeDigest;
  memory: ReturnType<typeof compressHistory>;
  userMessage: string;
  resumeData: ResumeData;
  internalMarkdown?: string;
}): string {
  const { intent, digest, memory, userMessage, resumeData, internalMarkdown } = parts;

  const systemRole = getSystemRole(intent.type);

  const resumeState = `
关键词：${digest.keywords.slice(0, 10).join('、')}
`.trim();

  const fullResumeContent = internalMarkdown?.trim()
    ? buildFullResumeContent(resumeData, internalMarkdown, 2000)
    : buildFallbackContent(resumeData);

  const focusArea = digest.focusArea ? `
## 当前编辑区域
路径：${digest.focusArea.path}
内容：${digest.focusArea.content}
` : '';

  const recentChat = memory.recentMessages.length > 0 ? `
## 最近对话
${memory.recentMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')}
` : '';

  const relevantHistory = memory.relevantMessages.length > 0 ? `
## 相关历史
${memory.relevantMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')}
` : '';

  const earlySummary = memory.earlySummary ? `
## 早期操作
${memory.earlySummary}
` : '';

  const outputFormat = `
## 输出格式

返回以下 JSON，不要包含任何其他内容：

\`\`\`json
{
  "instructions": [{ "action": "update|add|delete|replace", "path": "content", "value": "Markdown内容", "reason": "修改理由" }],
  "message": "给用户的反馈消息"
}
\`\`\`

- action：update（更新）、add（追加）、delete（删除）、replace（替换）
- path：basicInfo.*、summary、content
- content 直接写 Markdown 原文，不要 JSON.stringify()
- 只返回增量修改，不要重写整份简历
`;

  return `
${systemRole}

## 当前简历状态（摘要）
${resumeState}

## 简历完整内容
${fullResumeContent}
${focusArea}
${recentChat}
${relevantHistory}
${earlySummary}

## 用户意图
类型：${intent.type}
目标：${intent.target || '全局'}

## 用户请求
${userMessage}

${outputFormat}
`.trim();
}

function getSystemRole(intentType: string): string {
  const roles: Record<string, string> = {
    create: '你是一个专业的简历撰写专家，擅长创建结构清晰、内容专业的简历。',
    optimize: '你是一个简历优化专家，擅长提升简历的表达质量和专业度。',
    add: '你是一个简历内容扩展专家，擅长补充和丰富简历内容。',
    modify: '你是一个简历编辑专家，擅长精准修改简历中的特定内容。',
    delete: '你是一个简历精简专家，擅长删除冗余内容，保持简历简洁。',
    query: '你是一个简历咨询顾问，擅长回答简历相关的问题。'
  };
  return roles[intentType] || roles.create;
}

// ==================== 应用更新指令 ====================

export function applyInstructions(resumeData: ResumeData, instructions: UpdateInstruction[]): ResumeData {
  const newData: ResumeData = resumeData ? cloneDeep(resumeData) : {};

  for (const instruction of instructions) {
    try {
      switch (instruction.action) {
        case 'add': {
          // 追加到 content
          if (instruction.path === 'content' && instruction.value) {
            newData.content = (newData.content || '') + '\n' + instruction.value;
          }
          break;
        }
        case 'update':
        case 'replace':
          if (instruction.path) {
            setPath(newData, instruction.path, instruction.value);
          }
          break;
        case 'delete':
          if (instruction.path) {
            deletePath(newData, instruction.path);
          }
          break;
      }
    } catch (error) {
      console.error(`应用指令失败: ${instruction.path}`, error);
    }
  }

  return newData;
}

function setPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) cur[parts[i]] = {};
    cur = cur[parts[i]];
  }
  cur[parts[parts.length - 1]] = value;
}

function deletePath(obj: any, path: string) {
  const parts = path.split('.');
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    if (!cur[parts[i]]) return;
    cur = cur[parts[i]];
  }
  delete cur[parts[parts.length - 1]];
}

// ==================== 数据清理 ====================

export function cleanInvalidKeys(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;

  const result: any = Array.isArray(obj) ? [] : {};
  for (const key of Object.keys(obj)) {
    if (key === '') continue; // 跳过空字符串键
    if (obj[key] && typeof obj[key] === 'object') {
      result[key] = cleanInvalidKeys(obj[key]);
    } else {
      result[key] = obj[key];
    }
  }
  return result;
}

// ==================== 导出主 Hook ====================

export function useResumeAI() {
  return {
    detectIntent,
    digestResume,
    compressHistory,
    buildOptimizedPrompt,
    applyInstructions,
    cleanInvalidKeys
  };
}
