import { defineStore } from 'pinia';
import { getNotificationsApi, markAllNotificationsAsReadApi, markNotificationAsReadApi } from '@/api/modules/notifications';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';

const MOCK = true;
const PAGE_SIZE = 10;

function makeMockLogs(): OperationLog[] {
  const now = Date.now();
  const day = 86400000;
  return [
    { id: 1, action_type: 'interview_started', action_status: 'success', action_data: { job_position: '前端工程师' }, resource_type: 'interview', resource_id: 's1', is_read: false, timestamp: new Date(now - 120000).toISOString() },
    { id: 2, action_type: 'interview_completed', action_status: 'success', action_data: { job_position: '后端工程师', score: 92 }, resource_type: 'interview', resource_id: 's2', is_read: false, timestamp: new Date(now - 3 * 3600000).toISOString() },
    { id: 3, action_type: 'interview_aborted', action_status: 'warning', action_data: { job_position: '产品经理', answered: 3, total: 8 }, resource_type: 'interview', resource_id: 's3', is_read: true, timestamp: new Date(now - day).toISOString() },
    { id: 4, action_type: 'resume_exported', action_status: 'success', action_data: { template_name: '简约模板', pages: 2, download_url: '/api/resumes/1/export/' }, resource_type: 'resume', resource_id: '1', is_read: true, timestamp: new Date(now - 3600000).toISOString() },
    { id: 5, action_type: 'resume_diagnosed', action_status: 'success', action_data: { jd_name: '高级前端', score: 89 }, resource_type: 'resume', resource_id: 'r1', is_read: false, timestamp: new Date(now - 5 * 3600000).toISOString() },
    { id: 6, action_type: 'resume_generated', action_status: 'success', action_data: { method: '对话生成' }, resource_type: 'resume', resource_id: '2', is_read: true, timestamp: new Date(now - 2 * day).toISOString() },
    { id: 7, action_type: 'resume_saved', action_status: 'success', action_data: { template_name: '经典模板' }, resource_type: 'resume', resource_id: '2', is_read: true, timestamp: new Date(now - 2 * day - 3600000).toISOString() },
    { id: 8, action_type: 'report_generated', action_status: 'success', action_data: { report_type: '面试', score: 88 }, resource_type: 'report', resource_id: 'rpt1', is_read: false, timestamp: new Date(now - 4 * day).toISOString() },
    { id: 9, action_type: 'interview_started', action_status: 'success', action_data: { job_position: 'UI设计师' }, resource_type: 'interview', resource_id: 's4', is_read: true, timestamp: new Date(now - 5 * day).toISOString() },
    { id: 10, action_type: 'resume_exported', action_status: 'success', action_data: { template_name: '商务模板', pages: 3, download_url: '/api/resumes/3/export/' }, resource_type: 'resume', resource_id: '3', is_read: true, timestamp: new Date(now - 6 * day).toISOString() },
    { id: 11, action_type: 'interview_completed', action_status: 'success', action_data: { job_position: '数据分析师', score: 76 }, resource_type: 'interview', resource_id: 's5', is_read: true, timestamp: new Date(now - 8 * day).toISOString() },
  ];
}

export const useNotificationStore = defineStore('notification', {
  state: () => ({
    logs: [] as OperationLog[],
    unreadCount: 0,
    isLoading: false,
    activeCategory: null as ActionCategory | null,
    nextPage: 1,
    hasMore: true,
  }),

  getters: {
    filteredLogs(state): OperationLog[] {
      if (!state.activeCategory) return state.logs;
      return state.logs.filter(l => l.resource_type === state.activeCategory);
    },
  },

  actions: {
    async fetchNotifications() {
      this.isLoading = true;
      try {
        if (MOCK) {
          this.logs = makeMockLogs();
          this.unreadCount = this.logs.filter(n => !n.is_read).length;
          this.nextPage = 2;
          this.hasMore = false;
        } else {
          const response = await getNotificationsApi({ page: 1, page_size: PAGE_SIZE });
          this.logs = response.results;
          this.unreadCount = this.logs.filter(n => !n.is_read).length;
          this.hasMore = !!response.next;
          this.nextPage = 2;
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchNextPage() {
      if (!this.hasMore || this.isLoading) return;
      this.isLoading = true;
      try {
        if (MOCK) {
          this.hasMore = false;
        } else {
          const response = await getNotificationsApi({ page: this.nextPage, page_size: PAGE_SIZE });
          this.logs.push(...response.results);
          this.hasMore = !!response.next;
          this.nextPage++;
        }
      } catch (error) {
        console.error('Failed to fetch next page:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async markAsRead(log: OperationLog) {
      if (log.is_read) return;
      try {
        if (!MOCK) await markNotificationAsReadApi(log.id);
        const target = this.logs.find(n => n.id === log.id);
        if (target) {
          target.is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch (error) {
        console.error('Failed to mark notification as read:', error);
      }
    },

    async markAllAsRead() {
      if (this.unreadCount === 0) return;
      try {
        if (!MOCK) await markAllNotificationsAsReadApi();
        this.logs.forEach(n => { n.is_read = true; });
        this.unreadCount = 0;
      } catch (error) {
        console.error('Failed to mark all notifications as read:', error);
      }
    },

    setCategory(category: ActionCategory | null) {
      this.activeCategory = category;
    },
  },
});
