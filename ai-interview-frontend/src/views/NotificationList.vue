<template>
  <div class="nl-page">
    <div class="nl-header">
      <h2 class="nl-title">操作日志</h2>
      <button class="nl-read-all-btn" :disabled="store.unreadCount === 0" @click="store.markAllAsRead()">
        <el-icon :size="14"><Check /></el-icon>
        全部已读
      </button>
    </div>

    <div class="nl-tabs">
      <button
        v-for="tab in tabs"
        :key="String(tab.key)"
        class="nl-tab"
        :class="{ active: store.activeCategory === tab.key }"
        @click="store.setCategory(tab.key)"
      >
        {{ tab.label }}
      </button>
    </div>

    <div class="nl-list" v-loading="store.isLoading">
      <template v-for="group in groupedLogs" :key="group.label">
        <div class="nl-date-header">{{ group.label }}</div>
        <div
          v-for="log in group.items"
          :key="log.id"
          class="nl-item"
          :class="{ unread: !log.is_read }"
          @click="handleItemClick(log)"
        >
          <div class="nl-timeline">
            <span class="nl-dot" :class="`nl-dot--${log.action_status}`"></span>
            <span class="nl-line"></span>
          </div>
          <div class="nl-body">
            <p class="nl-text">{{ formatText(log) }}</p>
            <p class="nl-time">{{ formatTimestamp(log.timestamp) }}</p>
          </div>
          <div v-if="actionRoute(log) || log.action_type === 'resume_exported'" class="nl-actions" @click.stop>
            <template v-if="log.action_type === 'resume_exported' && log.action_data.download_url">
              <a :href="log.action_data.download_url" class="nl-action-btn" target="_blank">再次导出</a>
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
        <button class="nl-more-btn" :disabled="store.isLoading" @click="store.fetchNextPage()">
          <el-icon v-if="store.isLoading" class="is-loading"><Loading /></el-icon>
          加载更多
        </button>
      </div>

      <div v-if="!store.isLoading && store.logs.length === 0" class="nl-empty">
        <el-icon :size="36"><Clock /></el-icon>
        <p class="nl-empty-title">暂无操作记录</p>
        <p class="nl-empty-sub">当你进行面试、编辑简历或生成报告时，操作记录会显示在这里</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useActivityLogStore } from '@/store/modules/activityLog';
import type { OperationLog, ActionCategory } from '@/api/modules/notifications';
import { Check, Clock, Loading } from '@element-plus/icons-vue';
import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import isYesterday from 'dayjs/plugin/isYesterday';
import type { RouteLocationRaw } from 'vue-router';

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
    else key = d.format('YYYY-MM-DD');
    if (!groups[key]) groups[key] = [];
    groups[key].push(log);
  }
  const keys = Object.keys(groups).sort((a, b) => {
    if (a === '今天') return -1;
    if (b === '今天') return 1;
    if (a === '昨天') return -1;
    if (b === '昨天') return 1;
    return b.localeCompare(a);
  });
  return keys.map(k => ({ label: k, items: groups[k]! }));
});

const routeMap: Record<string, { name: string; paramKey?: string; queryKey?: string }> = {
  interview_started: { name: 'InterviewRoom', paramKey: 'id' },
  interview_completed: { name: 'ReportDetail', paramKey: 'id' },
  interview_aborted: { name: 'InterviewRoom', paramKey: 'id' },
  resume_diagnosed: { name: 'AnalysisReportDetail', paramKey: 'reportId' },
  resume_generated: { name: 'ResumeGenerator', queryKey: 'resumeId' },
  resume_saved: { name: 'ResumeGenerator', queryKey: 'resumeId' },
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
  if (r.queryKey) return { name: r.name, query: { [r.queryKey]: log.resource_id } };
  if (r.paramKey) return { name: r.name, params: { [r.paramKey]: log.resource_id } };
  return null;
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
.nl-page {
  height: 100%;
  overflow-y: auto;
  max-width: 720px;
  margin: 0 auto;
  padding: 32px 24px;

  &::-webkit-scrollbar { width: 6px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb {
    background: var(--color-warm-silver);
    border-radius: 3px;
  }
}

.nl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.nl-title {
  font-family: var(--font-serif), Georgia, serif;
  font-size: 25px;
  font-weight: 500;
  line-height: 1.20;
  color: var(--color-near-black);
  margin: 0;
}

.nl-read-all-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
  border: none;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--color-ring-warm);
  transition: background 0.2s;

  &:hover { background: #dedcd0; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.nl-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 24px;
  padding: 4px;
  background: var(--color-warm-sand);
  border-radius: 10px;
  width: fit-content;
}

.nl-tab {
  font-family: var(--font-sans), Arial, sans-serif;
  padding: 6px 16px;
  border: none;
  border-radius: 7px;
  background: transparent;
  color: var(--color-stone-gray);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s;

  &.active {
    background: var(--color-ivory);
    color: var(--color-near-black);
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.06);
  }

  &:hover:not(.active) {
    color: var(--color-charcoal-warm);
  }
}

.nl-list {
  position: relative;
}

.nl-date-header {
  font-family: var(--font-sans), Arial, sans-serif;
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: var(--color-stone-gray);
  padding: 20px 0 8px 40px;
  border-bottom: 1px solid var(--color-border-cream);
  margin-bottom: 4px;

  &:first-child { padding-top: 0; }
}

.nl-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 8px;
  border-radius: 10px;
  cursor: pointer;
  transition: background 0.15s;
  position: relative;

  &:hover { background: var(--color-warm-sand); }

  &.unread {
    background: rgba(201, 100, 66, 0.04);
  }
}

.nl-timeline {
  width: 24px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 6px;
}

.nl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  position: relative;
  z-index: 1;

  &--success { background: var(--el-color-success, #67c23a); }
  &--warning { background: var(--el-color-warning, #e6a23c); }
  &--error   { background: var(--el-color-danger, #f56c6c); }
}

.nl-line {
  width: 1px;
  flex: 1;
  min-height: 24px;
  background: var(--color-border-cream);
  margin-top: 4px;
}

.nl-item:last-child .nl-line {
  display: none;
}

.nl-body {
  flex: 1;
  min-width: 0;
}

.nl-text {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 0;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.43;
  color: var(--color-near-black);
}

.nl-time {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 400;
  letter-spacing: 0.12px;
  color: var(--color-stone-gray);
}

.nl-actions {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  align-self: center;
}

.nl-action-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  display: inline-flex;
  align-items: center;
  padding: 5px 14px;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-terracotta);
  border: 1px solid var(--color-border-cream);
  border-radius: 6px;
  text-decoration: none;
  background: var(--color-ivory);
  cursor: pointer;
  transition: background 0.15s;
  white-space: nowrap;

  &:hover { background: var(--color-parchment); }
}

.nl-more {
  text-align: center;
  padding: 24px 0;
}

.nl-more-btn {
  font-family: var(--font-sans), Arial, sans-serif;
  background: var(--color-warm-sand);
  color: var(--color-charcoal-warm);
  border: none;
  padding: 6px 20px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  box-shadow: 0 0 0 1px var(--color-ring-warm);
  transition: background 0.2s;
  display: inline-flex;
  align-items: center;
  gap: 6px;

  &:hover { background: #dedcd0; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

.nl-empty {
  text-align: center;
  padding: 72px 0;
  color: var(--color-stone-gray);

  .el-icon { color: var(--color-warm-silver); margin-bottom: 12px; }
}

.nl-empty-title {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--color-charcoal-warm);
}

.nl-empty-sub {
  font-family: var(--font-sans), Arial, sans-serif;
  margin: 6px 0 0;
  font-size: 12px;
  color: var(--color-warm-silver);
}
</style>
