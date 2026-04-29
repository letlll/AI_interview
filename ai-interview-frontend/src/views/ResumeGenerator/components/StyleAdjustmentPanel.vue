<template>
  <div class="style-panel-root">
    <el-tabs v-model="activeTab" class="style-tabs">
        <!-- ==================== Tab1: 快捷调整 ==================== -->
        <el-tab-pane label="快捷调整" name="quick">
          <div class="quick-panel">
            <div class="section-title">页面布局</div>

            <div class="control-item">
              <div class="control-label">
                <span>页面宽度</span>
                <span class="control-value">{{ values.maxWidth }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.maxWidth)"
                @update:model-value="onMaxWidth"
                :min="600" :max="1200" :step="10" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>内边距</span>
                <span class="control-value">{{ values.padding }}</span>
              </div>
              <el-slider
                :model-value="parseInt(values.padding)"
                @update:model-value="onPadding"
                :min="16" :max="80" :step="4" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>圆角</span>
                <span class="control-value">{{ values.borderRadius }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.borderRadius)"
                @update:model-value="onBorderRadius"
                :min="0" :max="24" :step="2" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>阴影</span>
                <el-switch
                  :model-value="values.boxShadow !== 'none'"
                  @update:model-value="onBoxShadow"
                  size="small"
                />
              </div>
            </div>

            <el-divider />

            <div class="section-title">字体与颜色</div>

            <div class="control-item">
              <div class="control-label">
                <span>正文字号</span>
                <span class="control-value">{{ values.fontSize }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.fontSize)"
                @update:model-value="onFontSize"
                :min="12" :max="22" :step="1" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>行高</span>
                <span class="control-value">{{ values.lineHeight }}</span>
              </div>
              <el-slider
                :model-value="parseFloat(values.lineHeight)"
                @update:model-value="onLineHeight"
                :min="1.2" :max="2.4" :step="0.05" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>主题色</span>
                <el-color-picker
                  :model-value="values.accentColor"
                  @update:model-value="onAccentColor"
                  size="small"
                />
              </div>
            </div>

            <el-divider />

            <div class="section-title">姓名</div>

            <div class="control-item">
              <div class="control-label">
                <span>姓名字号</span>
                <span class="control-value">{{ values.nameFontSize }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.nameFontSize)"
                @update:model-value="onNameFontSize"
                :min="20" :max="52" :step="2" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>姓名对齐</span>
              </div>
              <el-radio-group
                :model-value="values.nameTextAlign"
                @update:model-value="onNameTextAlign"
                size="small"
              >
                <el-radio-button value="left">左对齐</el-radio-button>
                <el-radio-button value="center">居中</el-radio-button>
                <el-radio-button value="right">右对齐</el-radio-button>
              </el-radio-group>
            </div>

            <el-divider />

            <div class="section-title">区块标题</div>

            <div class="control-item">
              <div class="control-label">
                <span>标题字号</span>
                <span class="control-value">{{ values.sectionTitleFontSize }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.sectionTitleFontSize)"
                @update:model-value="onSectionTitleFontSize"
                :min="12" :max="28" :step="1" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>下划线粗细</span>
                <span class="control-value">{{ values.borderBottomWidth }}</span>
              </div>
              <el-slider
                :model-value="parseInt(values.borderBottomWidth)"
                @update:model-value="onBorderBottomWidth"
                :min="1" :max="6" :step="1" :show-tooltip="false"
              />
            </div>

            <el-divider />

            <div class="section-title">间距</div>

            <div class="control-item">
              <div class="control-label">
                <span>区块间距</span>
                <span class="control-value">{{ values.sectionMarginBottom }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.sectionMarginBottom)"
                @update:model-value="onSectionMarginBottom"
                :min="8" :max="64" :step="4" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>列表项间距</span>
                <span class="control-value">{{ values.itemGap }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.itemGap)"
                @update:model-value="onItemGap"
                :min="4" :max="40" :step="2" :show-tooltip="false"
              />
            </div>

            <el-divider />

            <div class="section-title">标签</div>

            <div class="control-item">
              <div class="control-label">
                <span>标签字号</span>
                <span class="control-value">{{ values.tagFontSize }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.tagFontSize)"
                @update:model-value="onTagFontSize"
                :min="10" :max="18" :step="1" :show-tooltip="false"
              />
            </div>

            <div class="control-item">
              <div class="control-label">
                <span>标签圆角</span>
                <span class="control-value">{{ values.tagBorderRadius }}px</span>
              </div>
              <el-slider
                :model-value="parseInt(values.tagBorderRadius)"
                @update:model-value="onTagBorderRadius"
                :min="0" :max="20" :step="2" :show-tooltip="false"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab2: 高级代码 ==================== -->
        <el-tab-pane label="高级代码" name="code">
          <div class="code-panel">
            <div class="code-tip">
              <el-icon><InfoFilled /></el-icon>
              可直接编辑 CSS 代码，所有修改将同步到预览
            </div>
            <el-input
              v-model="codeValue"
              type="textarea"
              :rows="20"
              placeholder=".resume-document { ... }"
              class="css-code-editor"
              @input="handleCodeInput"
            />
          </div>
        </el-tab-pane>
      </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';

// ==================== Props / Emits ====================
interface Props {
  extraStyles: string;
}

interface Emits {
  (e: 'update:extraStyles', val: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ==================== 状态 ====================
const activeTab = ref<'quick' | 'code'>('quick');

// ==================== 带类型的滑块更新函数（避免在模板中写 TS 类型注解） ====================
function onMaxWidth(v: number) { update('maxWidth', `${v}px`); }
function onPadding(v: number) { update('padding', `${v}px`); }
function onBorderRadius(v: number) { update('borderRadius', `${v}px`); }
function onFontSize(v: number) { update('fontSize', `${v}px`); }
function onLineHeight(v: number) { update('lineHeight', String(v)); }
function onNameFontSize(v: number) { update('nameFontSize', `${v}px`); }
function onSectionTitleFontSize(v: number) { update('sectionTitleFontSize', `${v}px`); }
function onBorderBottomWidth(v: number) { update('borderBottomWidth', `${v}px`); }
function onSectionMarginBottom(v: number) { update('sectionMarginBottom', `${v}px`); }
function onItemGap(v: number) { update('itemGap', `${v}px`); }
function onBoxShadow(v: boolean) { update('boxShadow', v ? '0 2px 12px rgba(0,0,0,0.1)' : 'none'); }
function onAccentColor(v: string | null) { update('accentColor', v ?? ''); }
function onNameTextAlign(v: string) { update('nameTextAlign', v); }
function onTagFontSize(v: number) { update('tagFontSize', `${v}px`); }
function onTagBorderRadius(v: number) { update('tagBorderRadius', `${v}px`); }

// ==================== 默认值 ====================
const DEFAULTS = {
  maxWidth: '800px',
  padding: '40px',
  borderRadius: '8px',
  boxShadow: '0 2px 12px rgba(0,0,0,0.1)',
  fontSize: '16px',
  lineHeight: '1.75',
  accentColor: '#409eff',
  nameFontSize: '32px',
  nameTextAlign: 'center',
  sectionTitleFontSize: '18px',
  borderBottomWidth: '2px',
  sectionMarginBottom: '32px',
  itemGap: '20px',
  tagFontSize: '14px',
  tagBorderRadius: '4px',
};

// ==================== 当前控件值 ====================
const values = ref({ ...DEFAULTS });

// ==================== 从 CSS 字符串解析出各个值 ====================
function parseCss(css: string) {
  const v = { ...DEFAULTS };

  const get = (selector: string, prop: string): string => {
    // 简单正则：匹配 .class { prop: value; }
    const re = new RegExp(
      `${escapeRe(selector)}\\s*\\{[^}]*?${escapeRe(prop)}\\s*:\\s*([^;}]+)`,
      'i'
    );
    const m = css.match(re);
    return m ? m[1].trim() : '';
  };

  // resume-document 相关
  v.maxWidth = get('.resume-document', 'max-width') || v.maxWidth;
  v.padding = get('.resume-document', 'padding') || v.padding;
  v.borderRadius = get('.resume-document', 'border-radius') || v.borderRadius;
  v.boxShadow = get('.resume-document', 'box-shadow') || v.boxShadow;
  v.fontSize = get('.resume-document', 'font-size') || v.fontSize;
  v.lineHeight = get('.resume-document', 'line-height') || v.lineHeight;

  // CSS 变量
  const accentM = css.match(/--accent\s*:\s*([^;}]+)/);
  if (accentM) v.accentColor = accentM[1].trim();

  // 姓名
  v.nameFontSize = get('.resume-name', 'font-size') || v.nameFontSize;
  v.nameTextAlign = get('.resume-name', 'text-align') || v.nameTextAlign;

  // 标题
  v.sectionTitleFontSize = get('.section-title', 'font-size') || v.sectionTitleFontSize;
  v.borderBottomWidth = get('.section-title', 'border-bottom-width') ||
                        get('.section-title', 'border-bottom').replace(/[0-9.]+/, '').trim() || v.borderBottomWidth;

  // 间距
  v.sectionMarginBottom = get('.resume-section', 'margin-bottom') || v.sectionMarginBottom;

  // item gap (列表)
  const workListM = css.match(/\.work-list[^}]*gap\s*:\s*([^;}]+)/i);
  if (workListM) v.itemGap = workListM[1].trim();

  // 标签
  v.tagFontSize = get('.skill-tag', 'font-size') || v.tagFontSize;
  v.tagBorderRadius = get('.skill-tag', 'border-radius') || v.tagBorderRadius;

  return v;
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// ==================== 编译控件值为 CSS 字符串 ====================
function compileCss(v: typeof values.value): string {
  return `.resume-document {
  max-width: ${v.maxWidth};
  padding: ${v.padding};
  border-radius: ${v.borderRadius};
  box-shadow: ${v.boxShadow};
  font-size: ${v.fontSize};
  line-height: ${v.lineHeight};
}

:root {
  --accent: ${v.accentColor};
}

.resume-name {
  font-size: ${v.nameFontSize};
  text-align: ${v.nameTextAlign};
}

.section-title {
  font-size: ${v.sectionTitleFontSize};
  border-bottom-width: ${v.borderBottomWidth};
}

.resume-section {
  margin-bottom: ${v.sectionMarginBottom};
}

.work-list,
.project-list,
.education-list {
  gap: ${v.itemGap};
}

.skill-tag {
  font-size: ${v.tagFontSize};
  border-radius: ${v.tagBorderRadius};
}`;
}

// ==================== 同步 from props → internal state ====================
watch(
  () => props.extraStyles,
  (newCss) => {
    if (activeTab.value === 'quick') {
      values.value = parseCss(newCss || '');
    }
  },
  { immediate: true }
);

// ==================== 控件值变化 → 更新 extraStyles ====================
function update(key: keyof typeof DEFAULTS, newVal: string) {
  values.value = { ...values.value, [key]: newVal };
  emit('update:extraStyles', compileCss(values.value));
}

// ==================== 高级代码编辑 ====================
const codeValue = ref('');

// activeTab watch 的 emit 在 mounted 阶段会误触发，加标志拦截
const isPanelMounted = ref(false);
onMounted(() => { isPanelMounted.value = true; });

watch(
  () => props.extraStyles,
  (newCss) => {
    codeValue.value = newCss || '';
    if (activeTab.value === 'quick') {
      values.value = parseCss(newCss || '');
    }
  },
  { immediate: true }
);

watch(activeTab, (tab) => {
  if (tab === 'quick') {
    // 只有用户手动切换到 quick tab 时才同步，mounted 初始跳过
    emit('update:extraStyles', compileCss(values.value));
  } else {
    // 切换到代码模式，优先用 props 中的实际值
    codeValue.value = props.extraStyles || codeValue.value;
  }
});

function handleCodeInput() {
  emit('update:extraStyles', codeValue.value);
  if (activeTab.value === 'code') {
    // 尝试同步回滑块（解析失败则保持原值）
    try {
      values.value = parseCss(codeValue.value);
    } catch (_) { /* ignore */ }
  }
}
</script>

<style scoped>
.style-panel-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.style-tabs {
  flex: 1;
}

:deep(.el-tabs__content) {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding-right: 4px;
}

.quick-panel {
  padding: 4px 4px 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin: 12px 0 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.control-item {
  margin-bottom: 4px;
}

.control-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: #303133;
  margin-bottom: 4px;
}

.control-value {
  color: #409eff;
  font-weight: 500;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.code-panel {
  padding: 4px;
}

.code-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #909399;
  margin-bottom: 12px;
  background: #f4f4f5;
  padding: 8px 12px;
  border-radius: 6px;
}

.css-code-editor :deep(textarea) {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  color: #333;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
}
</style>
