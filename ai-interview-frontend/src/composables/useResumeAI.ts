/**
 * 简历 AI 助手 - 智能 Prompt 构建与意图识别
 * 实现 Token 优化和上下文压缩
 */

import { set as _set, get as _get, cloneDeep } from 'lodash-es';

// ==================== 类型定义 ====================

export interface UserIntent {
  type: 'create' | 'modify' | 'optimize' | 'add' | 'delete' | 'query';
  target?: string; // 如 'workExperience.0' 或 'skills'
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
    skillCount: number;
    workCount: number;
    projectCount: number;
    educationCount: number;
  };
  keywords: string[];
  focusArea?: {
    path: string;
    content: any;
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

export interface ResumeData {
  basicInfo?: {
    name?: string;
    phone?: string;
    email?: string;
    location?: string;
    position?: string;
  };
  skills?: string[];
  workExperience?: Array<{
    company: string;
    position: string;
    duration: string;
    description: string[];
  }>;
  projects?: Array<{
    name: string;
    role: string;
    duration: string;
    description: string[];
  }>;
  education?: Array<{
    school: string;
    major: string;
    degree: string;
    duration: string;
  }>;
}

// ==================== 意图识别 ====================

export function detectIntent(message: string, lastEditedField?: string): UserIntent {
  
  // 关键词模式匹配
  const patterns = {
    create: /生成|创建|新建|帮我写|制作/,
    modify: /修改|更改|改成|换成|调整/,
    optimize: /优化|改进|提升|润色|完善|美化/,
    add: /添加|增加|加上|补充|再加/,
    delete: /删除|移除|去掉|删掉/,
    query: /怎么|如何|什么|为什么|可以吗/
  };

  // 匹配意图类型
  let intentType: UserIntent['type'] = 'query';
  let confidence = 0.5;

  for (const [type, pattern] of Object.entries(patterns)) {
    if (pattern.test(message)) {
      intentType = type as UserIntent['type'];
      confidence = 0.8;
      break;
    }
  }

  // 提取目标字段
  const target = extractTarget(message, lastEditedField);

  return {
    type: intentType,
    target,
    confidence
  };
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
      // 尝试提取索引
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
  const workYears = calculateWorkYears(resume.workExperience || []);
  
  return {
    profile: {
      name: resume.basicInfo?.name || '未填写',
      position: resume.basicInfo?.position || '未指定',
      yearsOfExperience: workYears
    },
    stats: {
      skillCount: resume.skills?.length || 0,
      workCount: resume.workExperience?.length || 0,
      projectCount: resume.projects?.length || 0,
      educationCount: resume.education?.length || 0
    },
    keywords: extractKeywords(resume, 15),
    focusArea: focusPath ? {
      path: focusPath,
      content: _get(resume, focusPath)
    } : undefined
  };
}

function calculateWorkYears(workExp: any[]): number {
  if (!workExp.length) return 0;
  
  // 简单计算：假设每段工作平均 2 年
  return Math.min(workExp.length * 2, 10);
}

function extractKeywords(resume: ResumeData, topN: number): string[] {
  const text = JSON.stringify(resume);
  const words = text.match(/[\u4e00-\u9fa5a-zA-Z]{2,}/g) || [];
  
  // 统计词频
  const freq: Record<string, number> = {};
  words.forEach(word => {
    if (word.length > 1 && !isCommonWord(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  });
  
  // 排序并返回 Top N
  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word]) => word);
}

function isCommonWord(word: string): boolean {
  const common = ['的', '了', '在', '是', '和', '有', '为', '等', 'the', 'and', 'or'];
  return common.includes(word.toLowerCase());
}

// ==================== 对话历史压缩 ====================

export function compressHistory(messages: Message[], currentIntent: UserIntent) {
  
  return {
    // 最近 2 轮（4 条消息）完整保留
    recentMessages: messages.slice(-4),
    
    // 相关历史（语义过滤）
    relevantMessages: filterRelevantMessages(
      messages.slice(0, -4),
      currentIntent,
      2
    ),
    
    // 早期摘要
    earlySummary: summarizeEarlyMessages(messages.slice(0, -8))
  };
}

function filterRelevantMessages(
  messages: Message[],
  intent: UserIntent,
  topK: number
): Message[] {
  if (messages.length === 0) return [];
  
  // 计算相关性分数
  const scored = messages.map(msg => ({
    message: msg,
    score: calculateRelevance(msg, intent)
  }));
  
  // 排序并取 Top K
  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, topK)
    .map(item => item.message)
    .sort((a, b) => a.timestamp - b.timestamp);
}

function calculateRelevance(message: Message, intent: UserIntent): number {
  let score = 0;
  
  // 1. 目标字段匹配
  if (intent.target && message.content.includes(intent.target)) {
    score += 0.5;
  }
  
  // 2. 意图类型匹配
  const intentKeywords: Record<string, string[]> = {
    optimize: ['优化', '改进', '提升'],
    add: ['添加', '增加', '补充'],
    modify: ['修改', '更改', '调整']
  };
  
  const keywords = intentKeywords[intent.type] || [];
  if (keywords.some(kw => message.content.includes(kw))) {
    score += 0.3;
  }
  
  // 3. 时间衰减（10分钟半衰期）
  const ageMinutes = (Date.now() - message.timestamp) / (1000 * 60);
  const decay = Math.exp(-ageMinutes / 10);
  score *= decay;
  
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
  lastEditedField?: string
): string {
  // 1. 意图识别
  const intent = detectIntent(userMessage, lastEditedField);
  
  // 2. 简历摘要
  const digest = digestResume(resumeData, intent.target);
  
  // 3. 对话历史压缩
  const memory = compressHistory(chatHistory, intent);
  
  // 4. 构建 Prompt
  return assemblePrompt({
    intent,
    digest,
    memory,
    userMessage
  });
}

function assemblePrompt(parts: {
  intent: UserIntent;
  digest: ResumeDigest;
  memory: ReturnType<typeof compressHistory>;
  userMessage: string;
}): string {
  const { intent, digest, memory, userMessage } = parts;
  
  // 系统角色
  const systemRole = getSystemRole(intent.type);
  
  // 当前简历状态
  const resumeState = `
姓名：${digest.profile.name}
岗位：${digest.profile.position}
工作年限：${digest.profile.yearsOfExperience}年
统计：技能${digest.stats.skillCount}项、工作${digest.stats.workCount}段、项目${digest.stats.projectCount}个
关键词：${digest.keywords.slice(0, 10).join('、')}
`.trim();

  // 聚焦区域
  const focusArea = digest.focusArea ? `
## 当前编辑区域
路径：${digest.focusArea.path}
内容：
${JSON.stringify(digest.focusArea.content, null, 2)}
` : '';

  // 最近对话
  const recentChat = memory.recentMessages.length > 0 ? `
## 最近对话
${memory.recentMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')}
` : '';

  // 相关历史
  const relevantHistory = memory.relevantMessages.length > 0 ? `
## 相关历史
${memory.relevantMessages.map(m => `${m.role === 'user' ? '用户' : 'AI'}：${m.content}`).join('\n')}
` : '';

  // 早期摘要
  const earlySummary = memory.earlySummary ? `
## 早期操作
${memory.earlySummary}
` : '';

  // 输出格式
  const outputFormat = `
## 输出格式
请返回 JSON 格式的增量更新指令：
{
  "instructions": [
    {
      "action": "update",
      "path": "workExperience.0.description.0",
      "value": "优化后的内容",
      "reason": "修改理由"
    }
  ],
  "message": "给用户的反馈消息"
}

注意：
1. 只返回需要修改的部分，不要重写整个简历
2. action 可以是：add（添加）、update（更新）、delete（删除）、replace（替换）
3. path 使用点号分隔，如 "workExperience.0.description.1"
4. message 要简洁友好，告诉用户做了什么修改
`;

  return `
${systemRole}

## 当前简历状态
${resumeState}
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

export function applyInstructions(
  resumeData: ResumeData,
  instructions: UpdateInstruction[]
): ResumeData {
  // 如果 resumeData 为 null 或 undefined，初始化为空对象
  const newData = resumeData ? cloneDeep(resumeData) : {
    basicInfo: {},
    skills: [],
    workExperience: [],
    projects: [],
    education: []
  };
  
  for (const instruction of instructions) {
    try {
      switch (instruction.action) {
        case 'add':
          addToPath(newData, instruction.path, instruction.value);
          break;
        case 'update':
        case 'replace':
          _set(newData, instruction.path, instruction.value);
          break;
        case 'delete':
          deleteFromPath(newData, instruction.path);
          break;
      }
    } catch (error) {
      console.error(`应用指令失败: ${instruction.path}`, error);
    }
  }
  
  return newData;
}

function addToPath(obj: any, path: string, value: any) {
  const parts = path.split('.');
  const lastPart = parts.pop()!;
  
  // 确保中间路径的对象都存在
  const parent = parts.reduce((acc, part) => {
    if (!acc[part]) {
      // 如果下一个部分是数字，创建数组，否则创建对象
      const nextPart = parts[parts.indexOf(part) + 1];
      acc[part] = /^\d+$/.test(nextPart) ? [] : {};
    }
    return acc[part];
  }, obj);
  
  if (Array.isArray(parent)) {
    parent.push(value);
  } else {
    parent[lastPart] = value;
  }
}

function deleteFromPath(obj: any, path: string) {
  const parts = path.split('.');
  const lastPart = parts.pop()!;
  const parent = parts.reduce((acc, part) => acc[part], obj);
  
  if (Array.isArray(parent)) {
    const index = parseInt(lastPart);
    parent.splice(index, 1);
  } else {
    delete parent[lastPart];
  }
}

// ==================== 导出主 Hook ====================

export function useResumeAI() {
  return {
    detectIntent,
    digestResume,
    compressHistory,
    buildOptimizedPrompt,
    applyInstructions
  };
}
