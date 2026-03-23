// src/api/modules/resumeEditor.ts
import request from '@/api/request';
// 【核心修改】从 report.ts 导入更完整的类型
import type { ResumeAnalysisReportItem } from './report';
import type { ResumeLayout } from '@/store/modules/resumeEditor';
// 【核心修改】从 resume.ts 导入类型
import type { StructuredResume, EducationItem, WorkExperienceItem, ProjectExperienceItem, SkillItem } from './resume';

// 【核心修改】导出从 resume.ts 导入的类型，方便 store 使用
export type { StructuredResume, EducationItem, WorkExperienceItem, ProjectExperienceItem, SkillItem };


// --- 统一的 CRUD API 辅助函数 ---
const createApiEndpoints = <T>(resource: string) => ({
  list: (resumeId: number): Promise<T[]> => request({ url: `/resumes/${resumeId}/${resource}/`, method: 'get' }),
  create: (resumeId: number, data: T): Promise<T> => request({ url: `/resumes/${resumeId}/${resource}/`, method: 'post', data }),
  update: (resumeId: number, id: number, data: Partial<T>): Promise<T> => request({ url: `/resumes/${resumeId}/${resource}/${id}/`, method: 'patch', data }),
  destroy: (resumeId: number, id: number): Promise<void> => request({ url: `/resumes/${resumeId}/${resource}/${id}/`, method: 'delete' }),
});

// --- 为每个模块创建具体的 API 端点 ---
export const educationApi = createApiEndpoints<EducationItem>('educations');
export const workExperienceApi = createApiEndpoints<WorkExperienceItem>('work_experiences');
export const projectExperienceApi = createApiEndpoints<ProjectExperienceItem>('project_experiences');
export const skillApi = createApiEndpoints<SkillItem>('skills');

// API: 获取单个（结构化）简历的完整详情
export const getStructuredResumeApi = (resumeId: number): Promise<StructuredResume> => {
    return request({
        url: `/resumes/${resumeId}/`,
        method: 'get',
    });
};
// 【核心新增】AI 润色 API 函数
export const polishDescriptionApi = (html_content: string, job_position?: string): Promise<{ polished_html: string }> => {
  return request({
    url: '/polish-description/',
    method: 'post',
    data: {
      html_content,
      job_position,
    },
  });
};

// 定义分析报告的类型结构，以便获得完整的 TypeScript 类型提示
export interface AnalysisReport {
  overall_score: number;
   // 新增 ability_scores 类型定义
  ability_scores: {
    name: string;
    score: number;
  }[];
  keyword_analysis: {
    jd_keywords: string[];
    matched_keywords: string[];
    missing_keywords: string[];
  };
  strengths_analysis: string[];
  weaknesses_analysis: string[];
  suggestions: {
    module: string;
    suggestion: string;
  }[];
}

// 【核心修改】更新 analyzeResumeApi 的返回类型
export const analyzeResumeApi = (resume_id: number, jd_text: string): Promise<ResumeAnalysisReportItem> => {
  return request({
    url: '/analyze-resume/',
    method: 'post',
    data: {
      resume_id,
      jd_text,
    },
  });
};

export const generateResumeApi = (name: string, position: string, experience_years: string, keywords: string): Promise<ResumeLayout> => {
  return request({
    url: '/generate-resume/',
    method: 'post',
    data: { name, position, experience_years, keywords }
  });
};

// AI 对话式简历生成 API
export interface AIResumeInstruction {
  action: 'add' | 'update' | 'delete' | 'replace';
  path: string;
  value?: any;
  reason?: string;
}

export interface AIResumeResponse {
  instructions: AIResumeInstruction[];
  message: string;
}

// ========== 简历对话持久化 API ==========

export interface ChatConversation {
  id: number;
  participants: any[];
  conversation_type: 'user_user' | 'user_ai';
  resume_id: number | null;
  resume_title: string | null;
  resume: {
    id: number;
    title: string;
    content_json: any;
    template_name: string;
  } | null;
  conversation_type_display: string;
  updated_at: string;
  latest_message: ChatMessage | null;
  unread_count: number;
}

export interface ChatMessage {
  id: number;
  sender: any;
  content: string;
  message_type: string;
  file_url: string | null;
  timestamp: string;
  is_read: boolean;
  metadata: Record<string, any>;
}

export interface AIMessageResponse {
  user_message: ChatMessage;
  ai_response: ChatMessage;
  instructions: AIResumeInstruction[];
  message: string;
  updated_resume?: any;
}

// 获取用户的所有 AI 对话会话
export const getAIConversationsApi = (): Promise<ChatConversation[]> => {
  return request({
    url: '/chat/ai/conversations/',
    method: 'get',
  });
};

// 创建或获取 AI 对话会话
export const createAIConversationApi = (resumeId?: number): Promise<ChatConversation> => {
  return request({
    url: '/chat/ai/conversations/',
    method: 'post',
    data: resumeId ? { resume_id: resumeId } : {},
  });
};

// 获取对话消息历史
export const getAIMessagesApi = (conversationId: number): Promise<{ conversation_id: number; resume_id: number | null; resume_content?: any; messages: ChatMessage[] }> => {
  return request({
    url: `/chat/ai/conversations/${conversationId}/messages/`,
    method: 'get',
  });
};

// 发送消息并获取 AI 回复
export const sendAIMessageApi = (
  conversationId: number,
  content: string,
  lastEditedField?: string,
  optimizedPrompt?: string
): Promise<AIMessageResponse> => {
  return request({
    url: `/chat/ai/conversations/${conversationId}/messages/`,
    method: 'post',
    data: {
      content,
      last_edited_field: lastEditedField,
      optimized_prompt: optimizedPrompt,
    },
  });
};

// ========== 原有 API ==========

export const generateResumeFromChatApi = (
  userMessage: string,
  currentResumeData?: any,
  chatHistory?: Array<{ role: string; content: string }>,
  lastEditedField?: string,
  optimizedPrompt?: string
): Promise<AIResumeResponse> => {
  return request({
    url: '/generate-resume-chat/',
    method: 'post',
    data: {
      user_message: userMessage,
      current_resume: currentResumeData,
      chat_history: chatHistory,
      last_edited_field: lastEditedField,
      optimized_prompt: optimizedPrompt
    }
  });
};