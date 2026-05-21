<template>
  <div class="notification-center">
    <div class="nc-header">
      <h3>操作日志</h3>
      <el-button text type="primary" size="small" @click="store.markAllAsRead()">全部已读</el-button>
    </div>

    <div class="nc-filters">
      <el-button
        v-for="tab in tabs"
        :key="tab.key"
        size="small"
        :type="store.activeCategory === tab.key ? 'primary' : 'default'"
        :plain="store.activeCategory !== tab.key"
        @click="store.setCategory(tab.key)"
      >
        {{ tab.label }}
      </el-button>
    </div>

    <div class="nc-list" v-loading="store.isLoading">
      <div v-if="displayed.length === 0" class="nc-empty">暂无操作记录</div>
      <div
        v-for="item in displayed"
        :key="item.id"
        class="nc-item"
        :class="{ unread: !item.is_read }"
        @click="handleClick(item)"
      >
        <span class="nc-dot" :class="`dot-${item.action_status}`"></span>
        <div class="nc-item-body">
          <p class="nc-text">{{ formatText(item) }}</p>
          <p class="nc-time">{{ relativeTime(item.timestamp) }}</p>
        </div>
      </div>
    </div>

    <div class="nc-footer">
      <el-button text type="primary" size="small" @click="goFullPage">
        查看全部 →
      </el-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/store/modules/notification';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';

dayjs.extend(isToday);
dayjs.extend(isYesterday);

const store = useNotificationStore();
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
  interview_started: d => `你开始了【${d.job_position || ''}】面试`,
  interview_completed: d => `你完成了【${d.job_position || ''}】面试，得分 ${d.score ?? '--'}`,
  interview_aborted: d => `面试异常退出（已答 ${d.answered ?? 0}/${d.total ?? 0} 题）`,
  resume_exported: d => `你导出了【${d.template_name || ''}】简历（${d.pages ?? '?'}页）`,
  resume_diagnosed: d => `AI 诊断完成，匹配度 ${d.score ?? '--'}%`,
  resume_generated: d => `AI 生成完成（${d.method || ''}）`,
  resume_saved: d => `你发布了简历【${d.template_name || ''}】`,
  report_generated: d => `${d.report_type || ''}报告生成完毕，总分 ${d.score ?? '--'}`,
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

const routeMap: Record<string, { name: string; paramKey: string }> = {
  interview_started: { name: 'InterviewRoom', paramKey: 'id' },
  interview_completed: { name: 'ReportDetail', paramKey: 'id' },
  interview_aborted: { name: 'InterviewRoom', paramKey: 'id' },
  resume_diagnosed: { name: 'AnalysisReportDetail', paramKey: 'reportId' },
  resume_generated: { name: 'ResumeEditor', paramKey: 'id' },
  resume_saved: { name: 'ResumeEditor', paramKey: 'id' },
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
    router.push({ name: route.name, params: { [route.paramKey]: log.resource_id } });
  }
};

const goFullPage = () => {
  router.push({ name: 'NotificationList' });
};
</script>

<style lang="scss" scoped>
.notification-center { max-height: 420px; display: flex; flex-direction: column; }
.nc-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 16px; border-bottom: 1px solid var(--color-border-cream); }
.nc-header h3 { margin: 0; font-size: 14px; font-weight: 600; color: var(--color-near-black); }
.nc-filters { display: flex; gap: 6px; padding: 10px 16px; }
.nc-list { flex: 1; overflow-y: auto; min-height: 0; }
.nc-empty { text-align: center; color: var(--color-warm-silver); padding: 32px 0; font-size: 13px; }
.nc-item { display: flex; align-items: flex-start; gap: 10px; padding: 10px 16px; cursor: pointer; transition: background-color 0.15s; border-bottom: 1px solid var(--color-border-cream); }
.nc-item:hover { background-color: var(--color-parchment); }
.nc-item.unread { background-color: #f5f7fa; }
.nc-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.dot-success { background-color: #67c23a; }
.dot-warning { background-color: #e6a23c; }
.dot-error { background-color: #f56c6c; }
.nc-item-body { flex: 1; min-width: 0; }
.nc-text { margin: 0; font-size: 13px; color: var(--color-near-black); line-height: 1.5; }
.nc-time { margin: 2px 0 0; font-size: 11px; color: var(--color-warm-silver); }
.nc-footer { padding: 8px 16px; text-align: center; border-top: 1px solid var(--color-border-cream); }
</style>
