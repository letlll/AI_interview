<template>
  <div class="notification-center">
    <div class="nc-header">
      <h3 class="nc-title">操作日志</h3>
      <button class="nc-read-all-btn" :disabled="store.unreadCount === 0" @click="store.markAllAsRead()">
        全部已读
      </button>
    </div>

    <div class="nc-tabs">
      <button
        v-for="tab in tabs"
        :key="String(tab.key)"
        class="nc-tab"
        :class="{ active: store.activeCategory === tab.key }"
        @click="store.setCategory(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="nc-list" v-loading="store.isLoading">
      <div v-if="displayed.length === 0 && !store.isLoading" class="nc-empty">暂无操作记录</div>
      <div
        v-for="item in displayed"
        :key="item.id"
        class="nc-item"
        :class="{ unread: !item.is_read }"
        @click="handleClick(item)"
      >
        <span class="nc-dot" :class="`nc-dot--${item.action_status}`"></span>
        <div class="nc-item-body">
          <p class="nc-text">{{ formatText(item) }}</p>
          <p class="nc-time">{{ relativeTime(item.timestamp) }}</p>
        </div>
      </div>
    </div>

    <div class="nc-footer">
      <button class="nc-footer-btn" @click="goFullPage">
        查看全部 <span class="nc-arrow">&rarr;</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useActivityLogStore } from '@/store/modules/activityLog';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const store = useActivityLogStore();
const router = useRouter();

const tabs: { key: ActionCategory | null; label: string }[] = [
  { key: null, label: '全部' },
  { key: 'interview', label: '面试' },
  { key: 'resume', label: '简历' },
  { key: 'report', label: '报告' },
];

const displayed = computed(() => {
  const source = store.activeCategory
    ? store.logs.filter(l => l.resource_type === store.activeCategory)
    : store.logs;
  return source.slice(0, 5);
});

const templates: Record<string, (d: Record<string, any>) => string> = {
  interview_started: d => `你开始了【${d.job_position || '未知岗位'}】面试`,
  interview_completed: d => `你完成了【${d.job_position || '未知岗位'}】面试，得分 ${d.score ?? '--'}`,
  interview_aborted: d => `面试异常退出（已答 ${d.answered ?? 0}/${d.total ?? 0} 题）`,
  resume_exported: d => `你导出了【${d.template_name || '未知模板'}】简历（${d.pages ?? '?'}页）`,
  resume_diagnosed: d => `AI 诊断完成，匹配度 ${d.score ?? '--'}%`,
  resume_generated: d => `AI 生成完成（${d.method || '未知方式'}）`,
  resume_saved: d => `你发布了简历【${d.template_name || '未命名'}】`,
  report_generated: d => `${d.report_type || '未知'}报告生成完毕，总分 ${d.score ?? '--'}`,
};

const formatText = (log: OperationLog): string => {
  const fn = templates[log.action_type];
  return fn ? fn(log.action_data) : '你有一条操作记录';
};

const relativeTime = (ts: string): string => {
  const d = dayjs(ts);
  if (d.isToday()) return d.format('HH:mm');
  if (d.isYesterday()) return '昨天 ' + d.format('HH:mm');
  return d.format('MM-DD HH:mm');
};

const routeMap: Record<string, { name: string; paramKey?: string; queryKey?: string }> = {
  interview_started: { name: 'InterviewRoom', paramKey: 'id' },
  interview_completed: { name: 'ReportDetail', paramKey: 'id' },
  interview_aborted: { name: 'InterviewRoom', paramKey: 'id' },
  resume_diagnosed: { name: 'AnalysisReportDetail', paramKey: 'reportId' },
  resume_generated: { name: 'ResumeGenerator', queryKey: 'resumeId' },
  resume_saved: { name: 'ResumeGenerator', queryKey: 'resumeId' },
  report_generated: { name: 'ReportDetail', paramKey: 'id' },
};

const handleClick = (log: OperationLog) => {
  store.markAsRead(log);
  if (log.action_type === 'resume_exported') {
    if (log.action_data.download_url) {
      window.open(log.action_data.download_url, '_blank');
    }
    return;
  }
  const route = routeMap[log.action_type];
  if (route && log.resource_id) {
    if (route.queryKey) {
      router.push({ name: route.name, query: { [route.queryKey]: log.resource_id } });
    } else if (route.paramKey) {
      router.push({ name: route.name, params: { [route.paramKey]: log.resource_id } });
    }
  }
};

const goFullPage = () => {
  router.push({ name: 'NotificationList' });
};

onMounted(() => {
  if (store.logs.length === 0) store.fetchNotifications();
});
</script>

<style lang="scss" scoped>
.notification-center {
  max-height: 420px;
  display: flex;
  flex-direction: column;
}

.nc-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border-cream);
}

.nc-title {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--color-near-black);
}

.nc-read-all-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  background: none;
  border: none;
  color: var(--color-terracotta);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover { background: rgba(201, 100, 66, 0.06); }
  &:disabled { opacity: 0.35; cursor: not-allowed; }
}

.nc-tabs {
  display: flex;
  gap: 4px;
  padding: 10px 16px;
  background: var(--color-warm-sand);
  margin: 8px 12px;
  border-radius: 8px;
  width: fit-content;
}

.nc-tab {
  font-family: var(--font-sans), Arial, sans-serif;
  padding: 4px 12px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--color-stone-gray);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &.active {
    background: var(--color-ivory);
    color: var(--color-near-black);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  }

  &:hover:not(.active) { color: var(--color-charcoal-warm); }
}

.nc-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-warm-silver);
    border-radius: 2px;
  }
}

.nc-empty {
  text-align: center;
  color: var(--color-warm-silver);
  padding: 32px 0;
  font-size: 13px;
}

.nc-item {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 10px 16px;
  cursor: pointer;
  transition: background 0.12s;
  border-bottom: 1px solid var(--color-border-cream);

  &:hover { background: var(--color-warm-sand); }

  &.unread {
    background: rgba(201, 100, 66, 0.04);
  }
}

.nc-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 6px;
  flex-shrink: 0;

  &--success { background: var(--el-color-success, #67c23a); }
  &--warning { background: var(--el-color-warning, #e6a23c); }
  &--error   { background: var(--el-color-danger, #f56c6c); }
}

.nc-item-body {
  flex: 1;
  min-width: 0;
}

.nc-text {
  margin: 0;
  font-size: 13px;
  color: var(--color-near-black);
  line-height: 1.5;
}

.nc-time {
  margin: 2px 0 0;
  font-size: 11px;
  color: var(--color-warm-silver);
}

.nc-footer {
  padding: 8px 16px;
  text-align: center;
  border-top: 1px solid var(--color-border-cream);
}

.nc-footer-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  background: none;
  border: none;
  color: var(--color-terracotta);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  transition: background 0.15s;

  &:hover { background: rgba(201, 100, 66, 0.06); }
}

.nc-arrow {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 13px;
}
</style>
