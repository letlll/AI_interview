import { defineStore } from 'pinia';
import { getActivityLogsApi, markAllActivityLogsAsReadApi, markActivityLogAsReadApi } from '@/api/modules/notifications';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';

const PAGE_SIZE = 20;

export const useActivityLogStore = defineStore('activityLog', {
  state: () => ({
    logs: [] as OperationLog[],
    unreadCount: 0,
    isLoading: false,
    activeCategory: null as ActionCategory | null,
    nextPageUrl: null as string | null,
    hasMore: false,
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
        const params: Record<string, any> = { page: 1, page_size: PAGE_SIZE };
        if (this.activeCategory) params.resource_type = this.activeCategory;
        const response = await getActivityLogsApi(params);
        this.logs = response.results;
        this.unreadCount = this.logs.filter(n => !n.is_read).length;
        this.hasMore = !!response.next;
        this.nextPageUrl = response.next ?? null;
      } catch (error) {
        console.error('获取操作日志失败:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchNextPage() {
      if (!this.hasMore || this.isLoading || !this.nextPageUrl) return;
      this.isLoading = true;
      try {
        const url = new URL(this.nextPageUrl);
        const page = url.searchParams.get('page') || '2';
        const response = await getActivityLogsApi({ page, page_size: PAGE_SIZE });
        this.logs.push(...response.results);
        this.hasMore = !!response.next;
        this.nextPageUrl = response.next ?? null;
      } catch (error) {
        console.error('加载更多操作日志失败:', error);
      } finally {
        this.isLoading = false;
      }
    },

    async markAsRead(log: OperationLog) {
      if (log.is_read) return;
      try {
        await markActivityLogAsReadApi(log.id);
        const target = this.logs.find(n => n.id === log.id);
        if (target) {
          target.is_read = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      } catch (error) {
        console.error('标记已读失败:', error);
      }
    },

    async markAllAsRead() {
      if (this.unreadCount === 0) return;
      try {
        await markAllActivityLogsAsReadApi();
        this.logs.forEach(n => { n.is_read = true; });
        this.unreadCount = 0;
      } catch (error) {
        console.error('全部标记已读失败:', error);
      }
    },

    setCategory(category: ActionCategory | null) {
      this.activeCategory = category;
      this.fetchNotifications();
    },
  },
});
