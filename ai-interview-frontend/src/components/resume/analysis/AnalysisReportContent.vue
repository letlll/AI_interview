<template>
  <div class="analysis-report-content" v-if="report">
    <!-- 综合评估 -->
    <div class="report-card mb-6">
      <div class="score-hero">
        <el-progress type="dashboard" :percentage="percentage" :color="colors" :width="120">
          <template #default="{ percentage }">
            <span class="score-value">{{ percentage }}</span>
            <span class="score-label">匹配度</span>
          </template>
        </el-progress>
        <div>
          <h3 class="card-heading">综合评估</h3>
          <p class="card-description">这份简历与目标岗位的整体匹配度得分为 {{ report.overall_score }} 分。</p>
        </div>
      </div>
    </div>

    <!-- 能力维度雷达图 -->
    <div class="report-card mb-6">
      <div class="card-header"><span class="card-heading">能力维度分析</span></div>
      <div class="card-body">
        <div class="ability-grid">
          <div>
            <AbilityRadarChart :ability-scores="report.ability_scores" />
          </div>
          <div class="ability-list">
            <div v-for="ability in report.ability_scores" :key="ability.name" class="ability-item">
              <span class="ability-name">{{ ability.name }}</span>
              <div class="flex items-center">
                <el-rate v-model="ability.score" disabled show-score text-color="#c96442" score-template="{value} 分" :max="5" allow-half />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 关键词匹配分析 -->
    <div class="report-card mb-6">
      <div class="card-header"><span class="card-heading">关键词匹配分析</span></div>
      <div class="card-body">
        <div class="keyword-group">
          <p class="keyword-label">岗位核心要求 (JD):</p>
          <el-tag v-for="kw in report.keyword_analysis.jd_keywords" :key="kw" type="info" class="mr-2 mb-2">{{ kw }}</el-tag>
        </div>
        <div class="keyword-group">
          <p class="keyword-label">简历中匹配的关键词:</p>
          <el-tag v-for="kw in report.keyword_analysis.matched_keywords" :key="kw" type="success" class="mr-2 mb-2">{{ kw }}</el-tag>
        </div>
        <div class="keyword-group">
          <p class="keyword-label">简历中缺失的关键词:</p>
          <el-tag v-for="kw in report.keyword_analysis.missing_keywords" :key="kw" type="warning" class="mr-2 mb-2">{{ kw }}</el-tag>
        </div>
      </div>
    </div>

    <!-- 亮点与改进 -->
    <div class="two-col mb-6">
      <div class="report-card">
        <div class="card-header">
          <span class="card-heading"><el-icon class="icon-strength"><CircleCheckFilled /></el-icon>亮点分析</span>
        </div>
        <div class="card-body">
          <ul class="warm-list">
            <li v-for="(item, index) in report.strengths_analysis" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
      <div class="report-card">
        <div class="card-header">
          <span class="card-heading"><el-icon class="icon-weakness"><WarningFilled /></el-icon>待改进点</span>
        </div>
        <div class="card-body">
          <ul class="warm-list">
            <li v-for="(item, index) in report.weaknesses_analysis" :key="index">{{ item }}</li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 具体修改建议 -->
    <div class="report-card">
      <div class="card-header">
        <span class="card-heading"><el-icon class="icon-suggestion"><Edit /></el-icon>具体修改建议</span>
      </div>
      <div class="card-body">
        <el-timeline>
          <el-timeline-item
            v-for="(item, index) in report.suggestions"
            :key="index"
            hollow
            type="primary"
          >
            <p class="suggestion-module">针对模块: {{ item.module }}</p>
            <p class="suggestion-text">{{ item.suggestion }}</p>
          </el-timeline-item>
        </el-timeline>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AnalysisReport } from '@/api/modules/resumeEditor';
import { ElCard, ElProgress, ElTag, ElRate, ElTimeline, ElTimelineItem, ElIcon } from 'element-plus';
import { CircleCheckFilled, WarningFilled, Edit } from '@element-plus/icons-vue';
// [核心修正] 导入雷达图组件
import AbilityRadarChart from '@/components/common/AbilityRadarChart.vue';

const props = defineProps<{
  report: AnalysisReport;
}>();

const percentage = computed(() => {
  return props.report?.overall_score || 0;
});

const colors = [
  { color: '#f56c6c', percentage: 60 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#67c23a', percentage: 100 },
];
</script>
<style lang="scss" scoped>
.report-card { background: var(--color-ivory); border: 1px solid var(--color-border-cream); border-radius: 8px; box-shadow: rgba(0,0,0,0.05) 0px 4px 24px; overflow: hidden; }
.card-header { padding: 16px 20px; border-bottom: 1px solid var(--color-border-cream); }
.card-body { padding: 20px; }
.card-heading { font-family: var(--font-serif); font-size: 17.6px; font-weight: 500; line-height: 1.30; color: var(--color-near-black); display: flex; align-items: center; gap: 8px; }
.card-description { font-family: var(--font-sans); font-size: 14px; line-height: 1.43; color: var(--color-olive-gray); margin-top: 8px; }
.score-hero { display: flex; align-items: center; gap: 32px; padding: 24px 20px; }
.score-value { font-family: var(--font-serif); font-size: 32px; font-weight: 500; color: var(--color-near-black); }
.score-label { font-family: var(--font-sans); font-size: 12px; line-height: 1.60; letter-spacing: 0.12px; color: var(--color-warm-silver); }
.ability-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: center; }
@media (max-width: 768px) { .ability-grid { grid-template-columns: 1fr; } }
.ability-list { display: flex; flex-direction: column; gap: 12px; }
.ability-item { display: flex; justify-content: space-between; align-items: center; }
.ability-name { font-family: var(--font-sans); font-size: 14px; color: var(--color-charcoal-warm); }
.keyword-group { margin-bottom: 16px; }
.keyword-group:last-child { margin-bottom: 0; }
.keyword-label { font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--color-olive-gray); margin-bottom: 8px; }
.two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
@media (max-width: 768px) { .two-col { grid-template-columns: 1fr; } }
.icon-strength { color: #5a7a5a; }
.icon-weakness { color: #b87a30; }
.icon-suggestion { color: var(--color-terracotta); }
.warm-list { list-style: none; padding: 0; margin: 0; }
.warm-list li { font-family: var(--font-sans); font-size: 14px; line-height: 1.6; color: var(--color-charcoal-warm); padding: 6px 0 6px 16px; position: relative; }
.warm-list li::before { content: ''; position: absolute; left: 0; top: 12px; width: 5px; height: 5px; border-radius: 50%; background: var(--color-warm-sand); }
.suggestion-module { font-family: var(--font-sans); font-size: 14px; font-weight: 500; color: var(--color-near-black); }
.suggestion-text { font-family: var(--font-sans); font-size: 14px; line-height: 1.6; color: var(--color-olive-gray); margin-top: 4px; }
</style>
