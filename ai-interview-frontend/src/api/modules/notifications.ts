import request from '@/api/request';
import type { PaginatedResponse } from '@/types/api';

// ============================================================
// 操作日志 (Activity Logs) — 匹配后端 ActivityLog 模型
// ============================================================

export type ActionCategory = 'interview' | 'resume' | 'report';

export type ActionType =
  | 'interview_started' | 'interview_completed' | 'interview_aborted'
  | 'resume_exported' | 'resume_diagnosed' | 'resume_generated' | 'resume_saved'
  | 'report_generated';

export type ActionStatus = 'success' | 'warning' | 'error';

export interface OperationLog {
  id: number;
  action_type: ActionType;
  action_status: ActionStatus;
  action_data: Record<string, any>;
  resource_type: string;
  resource_id: string | number;
  is_read: boolean;
  timestamp: string;
}

export const getActivityLogsApi = (params?: any): Promise<PaginatedResponse<OperationLog>> => {
  return request({ url: '/activity-logs/', method: 'get', params });
};

export const markAllActivityLogsAsReadApi = (): Promise<void> => {
  return request({ url: '/activity-logs/mark-all-as-read/', method: 'post' });
};

export const markActivityLogAsReadApi = (id: number): Promise<void> => {
  return request({ url: `/activity-logs/${id}/mark-as-read/`, method: 'post' });
};
