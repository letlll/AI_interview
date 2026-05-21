<template>
  <div class="nl-page">
    <div class="nl-header">
      <h2>操作日志</h2>
      <el-button text type="primary" size="small" @click="store.markAllAsRead()">全部已读</el-button>
    </div>

    <div class="nl-filters">
      <el-button
        v-for="tab in tabs"
        :key="String(tab.key)"
        :type="store.activeCategory === tab.key ? 'primary' : 'default'"
        :plain="store.activeCategory !== tab.key"
        @click="store.setCategory(tab.key)"
      >
        {{ tab.label }}
      </el-button>
    </div>

    <div class="nl-timeline" v-loading="store.isLoading">
      <template v-for="group in groupedLogs" :key="group.label">
        <div class="nl-date-header">{{ group.label }}</div>
        <div
          v-for="log in group.items"
          :key="log.id"
          class="nl-item"
          :class="{ unread: !log.is_read }"
          @click="handleItemClick(log)"
        >
          <div class="nl-line">
            <span class="nl-dot" :class="`dot-${log.action_status}`"></span>
          </div>
          <div class="nl-body">
            <p class="nl-text">{{ formatText(log) }}</p>
            <p class="nl-time">{{ formatTimestamp(log.timestamp) }}</p>
          </div>
          <div class="nl-actions" @click.stop>
            <template v-if="log.action_type === 'resume_exported'">
              <a v-if="log.action_data.download_url" :href="log.action_data.download_url" class="nl-action-btn" target="_blank">再次导出</a>
            </template>
            <template v-else>
              <router-link
                v-if="actionRoute(log)"
                :to="actionRoute(log)!"
                class="nl-action-btn"
                @click="store.markAsRead(log)"
              >
                {{ actionLabel(log) }}
              </router-link>
            </template>
          </div>
        </div>
      </template>
      <div v-if="store.hasMore" class="nl-more">
        <el-button text type="primary" :loading="store.isLoading" @click="store.fetchNextPage()">加载更多</el-button>
      </div>
      <div v-if="!store.isLoading && store.logs.length === 0" class="nl-empty">暂无操作记录</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useNotificationStore } from '@/store/modules/notification';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import type { RouteLocationRaw } from 'vue-router';

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

const formatTimestamp = (ts: string): string => {
  const d = dayjs(ts);
  if (d.isToday()) return '今天 ' + d.format('HH:mm');
  if (d.isYesterday()) return '昨天 ' + d.format('HH:mm');
  return d.format('YYYY-MM-DD HH:mm');
};

interface LogGroup {
  label: string;
  items: OperationLog[];
}

const groupedLogs = computed<LogGroup[]>(() => {
  const source = store.filteredLogs;
  const groups: Record<string, OperationLog[]> = {};
  for (const log of source) {
    const d = dayjs(log.timestamp);
    let key: string;
    if (d.isToday()) key = '今天';
    else if (d.isYesterday()) key = '昨天';
    else key = '更早';
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  const order = ['今天', '昨天', '更早'];
  return order.filter(k => groups[k]?.length).map(k => ({ label: k, items: groups[k] }));
});

const routeMap: Record<string, { name: string; paramKey: string }> = {
  interview_started: { name: 'InterviewRoom', paramKey: 'id' },
  interview_completed: { name: 'ReportDetail', paramKey: 'id' },
  interview_aborted: { name: 'InterviewRoom', paramKey: 'id' },
  resume_diagnosed: { name: 'AnalysisReportDetail', paramKey: 'reportId' },
  resume_generated: { name: 'ResumeEditor', paramKey: 'id' },
  resume_saved: { name: 'ResumeEditor', paramKey: 'id' },
  report_generated: { name: 'ReportDetail', paramKey: 'id' },
};

const labels: Record<string, string> = {
  interview_started: '继续面试',
  interview_completed: '查看报告',
  interview_aborted: '恢复面试',
  resume_diagnosed: '查看诊断',
  resume_generated: '查看结果',
  resume_saved: '编辑简历',
  report_generated: '查看报告',
};

const actionRoute = (log: OperationLog): RouteLocationRaw | null => {
  const r = routeMap[log.action_type];
  if (!r || !log.resource_id) return null;
  return { name: r.name, params: { [r.paramKey]: log.resource_id } };
};

const actionLabel = (log: OperationLog): string => labels[log.action_type] || '查看';

const handleItemClick = (log: OperationLog) => {
  store.markAsRead(log);
  if (log.action_type === 'resume_exported') {
    if (log.action_data.download_url) window.open(log.action_data.download_url, '_blank');
    return;
  }
  const route = actionRoute(log);
  if (route) router.push(route);
};

onMounted(() => {
  if (store.logs.length === 0) store.fetchNotifications();
});
</script>

<style lang="scss" scoped>
.nl-page { max-width: 720px; margin: 0 auto; padding: 32px 24px; }
.nl-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.nl-header h2 { margin: 0; font-size: 20px; font-weight: 600; color: var(--color-near-black); }
.nl-filters { display: flex; gap: 8px; margin-bottom: 24px; }
.nl-timeline { position: relative; }
.nl-date-header { font-size: 13px; font-weight: 500; color: var(--color-warm-silver); padding: 12px 0 8px 36px; border-bottom: 1px solid var(--color-border-cream); margin-bottom: 4px; }
.nl-date-header:first-child { padding-top: 0; }
.nl-item { display: flex; align-items: flex-start; gap: 12px; padding: 12px 0; cursor: pointer; border-radius: 6px; transition: background-color 0.15s; position: relative; }
.nl-item:hover { background-color: rgba(0,0,0,0.02); }
.nl-item.unread { background-color: #f5f7fa; }
.nl-line { width: 24px; flex-shrink: 0; display: flex; flex-direction: column; align-items: center; padding-top: 3px; }
.nl-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.dot-success { background-color: #67c23a; }
.dot-warning { background-color: #e6a23c; }
.dot-error { background-color: #f56c6c; }
.nl-body { flex: 1; min-width: 0; }
.nl-text { margin: 0; font-size: 14px; color: var(--color-near-black); line-height: 1.5; }
.nl-time { margin: 4px 0 0; font-size: 12px; color: var(--color-warm-silver); }
.nl-actions { flex-shrink: 0; display: flex; align-items: center; }
.nl-action-btn {
  display: inline-block;
  padding: 4px 14px;
  font-size: 12px;
  color: var(--color-terracotta, #c75b4a);
  border: 1px solid var(--color-border-cream);
  border-radius: 4px;
  text-decoration: none;
  background: var(--color-ivory);
  cursor: pointer;
  transition: background-color 0.15s;
}
.nl-action-btn:hover { background-color: var(--color-parchment); }
.nl-more { text-align: center; padding: 24px 0; }
.nl-empty { text-align: center; color: var(--color-warm-silver); padding: 64px 0; font-size: 14px; }
</style>
