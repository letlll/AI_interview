/**
 * 简历 JSON ↔ Markdown 转换工具（极简版）
 *
 * 设计原则：
 * - content 存完整的 Markdown 字符串，不再解析为结构化数组
 * - AI 对话历史单独存 history
 */

// 极简版：整个简历就是一个 Markdown 字符串
export interface ResumeData {
  /** 完整的 Markdown 内容 */
  content?: string;
  /** AI 多轮对话历史 */
  history?: Array<{ role: string; content: string }>;
}

// ==================== JSON → Markdown ====================

/** JSON → Markdown（直接返回 content） */
export function jsonToResumeMarkdown(data: ResumeData | null | undefined): string {
  return data?.content || '';
}
