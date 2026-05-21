<!-- src/components/resume/analysis/AnalysisReportDrawer.vue -->
<template>
  <el-drawer
    :model-value="visible"
    title="AI 简历分析报告"
    direction="rtl"
    size="45%"
    @close="$emit('close')"
  >
    <div v-if="report" class="report-container">
      <!-- 1. 总体得分 -->
      <el-card class="report-section">
        <div class="score-section">
          <el-progress type="dashboard" :percentage="report.overall_score" :color="scoreColors" :width="120">
            <template #default="{ percentage }">
              <span class="percentage-value">{{ percentage }}</span>
              <span class="percentage-label">匹配度</span>
            </template>
          </el-progress>
          <div class="score-summary">
            <h3>综合评估</h3>
            <p>这份简历与目标岗位的整体匹配度得分为 {{ report.overall_score }} 分。</p>
          </div>
        </div>
      </el-card>

      <!-- 2. 关键词分析 -->
      <el-card class="report-section">
        <template #header><h3>关键词匹配分析</h3></template>
        <div class="keyword-section">
          <p><strong>岗位核心要求 (JD):</strong></p>
          <div class="tag-group">
            <el-tag v-for="kw in report.keyword_analysis.jd_keywords" :key="kw" type="info">{{ kw }}</el-tag>
          </div>
          <p><strong>简历中匹配的关键词:</strong></p>
          <div class="tag-group">
            <el-tag v-for="kw in report.keyword_analysis.matched_keywords" :key="kw" type="success">{{ kw }}</el-tag>
          </div>
          <p><strong>简历中缺失的关键词:</strong></p>
          <div class="tag-group">
            <el-tag v-for="kw in report.keyword_analysis.missing_keywords" :key="kw" type="warning">{{ kw }}</el-tag>
          </div>
        </div>
      </el-card>

      <!-- 3. 优势 & 劣势 -->
      <el-row :gutter="20">
        <el-col :span="12">
          <el-card class="report-section" class="report-section">
            <template #header><h3><el-icon color="#67C23A"><CircleCheckFilled /></el-icon> 亮点分析</h3></template>
            <ul>
              <li v-for="(item, index) in report.strengths_analysis" :key="index">{{ item }}</li>
            </ul>
          </el-card>
        </el-col>
        <el-col :span="12">
          <el-card class="report-section" class="report-section">
            <template #header><h3><el-icon color="#F56C6C"><WarningFilled /></el-icon> 待改进点</h3></template>
            <ul>
              <li v-for="(item, index) in report.weaknesses_analysis" :key="index">{{ item }}</li>
            </ul>
          </el-card>
        </el-col>
      </el-row>
      
      <!-- 4. 修改建议 -->
      <el-card class="report-section" class="report-section">
        <template #header><h3><el-icon color="#E6A23C"><Opportunity /></el-icon> 具体修改建议</h3></template>
        <div v-for="(item, index) in report.suggestions" :key="index" class="suggestion-item">
          <p><strong>针对模块: </strong><el-tag type="primary" size="small">{{ item.module }}</el-tag></p>
          <p>{{ item.suggestion }}</p>
        </div>
      </el-card>

    </div>
    <el-skeleton v-else :rows="10" animated />
  </el-drawer>
</template>

<script setup lang="ts">
import type { AnalysisReport } from '@/api/modules/resumeEditor';
import { CircleCheckFilled, WarningFilled, Opportunity } from '@element-plus/icons-vue';

defineProps<{
  visible: boolean;
  report: AnalysisReport | null;
}>();

defineEmits(['close']);

// 得分仪表盘颜色
const scoreColors = [
  { color: '#f56c6c', percentage: 50 },
  { color: '#e6a23c', percentage: 80 },
  { color: '#67c23a', percentage: 100 },
];
</script>

<style lang="scss" scoped>
.report-container { display: flex; flex-direction: column; gap: 20px; }
.report-section {
	background: var(--color-ivory);
	border: 1px solid var(--color-border-cream);
	border-radius: 8px;
	box-shadow: rgba(0, 0, 0, 0.05) 0px 4px 24px;
}
.report-section :deep(.el-card__header) { padding: 14px 18px; border-bottom: 1px solid var(--color-border-cream); }
.report-section :deep(.el-card__body) { padding: 18px; }
.report-section h3 { font-family: var(--font-serif); font-size: 16px; font-weight: 500; margin: 0; display: flex; align-items: center; gap: 8px; color: var(--color-near-black); }
.score-section { display: flex; align-items: center; gap: 24px; }
.percentage-value { font-family: var(--font-serif); font-size: 28px; font-weight: 500; color: var(--color-near-black); }
.percentage-label { font-family: var(--font-sans); font-size: 12px; line-height: 1.60; letter-spacing: 0.12px; color: var(--color-warm-silver); }
.tag-group { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 8px; margin-bottom: 16px; }
.report-section ul { padding-left: 20px; margin: 0; list-style: none; }
.report-section li { font-size: 14px; line-height: 1.6; color: var(--color-charcoal-warm); margin-bottom: 6px; padding-left: 16px; position: relative; }
.report-section li::before { content: ''; position: absolute; left: 0; top: 8px; width: 5px; height: 5px; border-radius: 50%; background: var(--color-warm-sand); }
.suggestion-item {
	border-bottom: 1px solid var(--color-parchment);
	padding-bottom: 12px;
	margin-bottom: 12px;
}
.suggestion-item:last-child { border-bottom: none; margin-bottom: 0; }
</style>