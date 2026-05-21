import request from '@/api/request';
import type { PaginatedResponse } from '@/types/api';

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

export const getNotificationsApi = (params?: any): Promise<PaginatedResponse<OperationLog>> => {
  return request({ url: '/notifications/', method: 'get', params });
};

export const markAllNotificationsAsReadApi = (): Promise<void> => {
  return request({ url: '/notifications/mark-all-as-read/', method: 'post' });
};

export const markNotificationAsReadApi = (id: number): Promise<void> => {
  return request({ url: `/notifications/${id}/mark-as-read/`, method: 'post' });
};
