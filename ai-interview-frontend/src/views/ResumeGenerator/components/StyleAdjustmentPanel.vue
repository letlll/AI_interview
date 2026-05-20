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

            <el-divider />

            <div class="section-title">快速预设</div>

            <div class="preset-section">
              <div class="preset-label">标题下划线</div>
              <div class="preset-row">
                <el-button
                  :type="presetBorderStyle === 'none' ? 'primary' : 'default'"
                  size="small"
                  @click="applyBorderPreset('none')"
                >无</el-button>
                <el-button
                  :type="presetBorderStyle === 'thin' ? 'primary' : 'default'"
                  size="small"
                  @click="applyBorderPreset('thin')"
                >细线</el-button>
                <el-button
                  :type="presetBorderStyle === 'thick' ? 'primary' : 'default'"
                  size="small"
                  @click="applyBorderPreset('thick')"
                >粗线</el-button>
                <el-button
                  :type="presetBorderStyle === 'left' ? 'primary' : 'default'"
                  size="small"
                  @click="applyBorderPreset('left')"
                >左侧竖线</el-button>
              </div>
            </div>

            <div class="preset-section">
              <div class="preset-label">标题配色</div>
              <div class="preset-row color-row">
                <button
                  class="color-preset-btn"
                  :class="{ active: presetColorScheme === 'default' }"
                  style="background: var(--color-near-black);"
                  title="经典黑"
                  @click="applyColorPreset('default')"
                ></button>
                <button
                  class="color-preset-btn"
                  :class="{ active: presetColorScheme === 'blue' }"
                  style="background: var(--color-focus-blue);"
                  title="专业蓝"
                  @click="applyColorPreset('blue')"
                ></button>
                <button
                  class="color-preset-btn"
                  :class="{ active: presetColorScheme === 'terracotta' }"
                  style="background: var(--color-terracotta);"
                  title="品牌色"
                  @click="applyColorPreset('terracotta')"
                ></button>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- ==================== Tab2: 高级代码 ==================== -->
        <el-tab-pane label="高级代码" name="code">
          <div class="code-panel-with-sidebar">
            <div class="class-sidebar">
              <el-input
                v-model="classFilter"
                placeholder="搜索 class..."
                size="small"
                clearable
                class="class-search"
              />
              <div class="class-list-scroll">
                <button
                  v-for="cls in filteredClassNames"
                  :key="cls"
                  class="class-chip"
                  @click="insertClass(cls)"
                  :title="'插入 ' + cls"
                >{{ cls }}</button>
              </div>
            </div>
            <div class="code-editor-main">
              <div class="code-tip">
                <el-icon><InfoFilled /></el-icon>
                点击左侧类名插入模板 — class 清单见"样式参考"标签页
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
          </div>
        </el-tab-pane>

        <!-- ==================== Tab3: 样式参考 ==================== -->
        <el-tab-pane label="样式参考" name="reference">
          <div class="reference-panel">
            <div class="ref-tip">
              <el-icon><InfoFilled /></el-icon>
              以下是简历中所有可用的 CSS class，修改 customStyles 时可参考
            </div>
            <el-collapse v-model="activeRefGroups">
              <el-collapse-item
                v-for="group in cssClassReference"
                :key="group.group"
                :title="group.group + '（' + group.classes.length + '）'"
                :name="group.group"
              >
                <div
                  v-for="cls in group.classes"
                  :key="cls.name"
                  class="class-card"
                >
                  <div class="class-card-header">
                    <code class="class-name" @click="copyClassName(cls.name)">{{ cls.name }}</code>
                    <el-button
                      size="small"
                      text
                      type="primary"
                      @click="insertClassAndSwitch(cls.name)"
                    >
                      插入代码
                    </el-button>
                  </div>
                  <p class="class-desc">{{ cls.desc }}</p>
                  <p class="class-props">常用属性：{{ cls.props }}</p>
                </div>
              </el-collapse-item>
            </el-collapse>
          </div>
        </el-tab-pane>
      </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, computed } from 'vue';
import { InfoFilled } from '@element-plus/icons-vue';
import { cssClassReference, allClassNames } from '@/composables/useResumeTheme';
import { ElMessage } from 'element-plus';

// ==================== Props / Emits ====================
interface Props {
  extraStyles: string;
  customStyles?: string;
}

interface Emits {
  (e: 'update:extraStyles', val: string): void;
  (e: 'update:customStyles', val: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// ==================== 状态 ====================
const activeTab = ref<'quick' | 'code' | 'reference'>('quick');

// ==================== 快捷调整 CSS 合并逻辑 ====================
// 快捷调整生成的 CSS 块用标记注释包裹，追加到 customStyles 末尾
// 不会覆盖用户在代码编辑器中手写的 customStyles
const AUTO_START = '/* === quick-adjust === */';
const AUTO_END = '/* === end-quick-adjust === */';

function emitQuickAdjustCss(css: string) {
  let current = props.customStyles || '';

  // 移除已有的 quick-adjust 块
  const markerRe = new RegExp(
    escapeRe(AUTO_START) + '[\\s\\S]*?' + escapeRe(AUTO_END),
    'g'
  );
  current = current.replace(markerRe, '').trim();

  // 构建新的 quick-adjust 块
  const block = `${AUTO_START}\n${css}\n${AUTO_END}`;

  // 用户手写内容在前，quick-adjust 块追加到末尾
  const merged = current ? current + '\n\n' + block : block;

  emit('update:customStyles', merged);
}

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
  accentColor: '#c96442',
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

  // 取最后一个匹配（CSS 层叠优先级最高）
  const get = (selector: string, prop: string): string => {
    const re = new RegExp(
      `${escapeRe(selector)}\\s*\\{[^}]*?${escapeRe(prop)}\\s*:\\s*([^;}]+)`,
      'gi'
    );
    let match: RegExpExecArray | null;
    let lastVal = '';
    while ((match = re.exec(css)) !== null) {
      lastVal = match[1].trim();
    }
    return lastVal;
  };

  // resume-document 相关
  v.maxWidth = get('.resume-document', 'max-width') || v.maxWidth;
  v.padding = get('.resume-document', 'padding') || v.padding;
  v.borderRadius = get('.resume-document', 'border-radius') || v.borderRadius;
  v.boxShadow = get('.resume-document', 'box-shadow') || v.boxShadow;
  v.fontSize = get('.resume-document', 'font-size') || v.fontSize;
  v.lineHeight = get('.resume-document', 'line-height') || v.lineHeight;

  // 姓名
  v.nameFontSize = get('.resume-name', 'font-size') || v.nameFontSize;
  v.nameTextAlign = get('.resume-name', 'text-align') || v.nameTextAlign;

  // 标题
  v.sectionTitleFontSize = get('.section-title', 'font-size') || get('.subsection-title', 'font-size') || v.sectionTitleFontSize;
  v.borderBottomWidth = get('.section-title', 'border-bottom-width') ||
                        get('.section-title', 'border-bottom').replace(/[0-9.]+/, '').trim() ||
                        get('.subsection-title', 'border-bottom-width') ||
                        get('.subsection-title', 'border-bottom').replace(/[0-9.]+/, '').trim() || v.borderBottomWidth;

  // 间距
  v.sectionMarginBottom = get('.section', 'margin-bottom') || v.sectionMarginBottom;

  // item gap (列表)
  const workListM = css.match(/\.work-list[^}]*gap\s*:\s*([^;}]+)/i);
  if (workListM) v.itemGap = workListM[1].trim();

  // 标签（.skill-item 是渲染器实际生成的 class）
  v.tagFontSize = get('.skill-item', 'font-size') || v.tagFontSize;
  v.tagBorderRadius = get('.skill-item', 'border-radius') || v.tagBorderRadius;

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

.resume-name {
  font-size: ${v.nameFontSize};
  text-align: ${v.nameTextAlign};
}

.section-title,
.subsection-title {
  font-size: ${v.sectionTitleFontSize};
  border-bottom-width: ${v.borderBottomWidth};
}

.section {
  margin-bottom: ${v.sectionMarginBottom};
}

.work-list,
.project-list,
.education-list {
  gap: ${v.itemGap};
}

.skill-item {
  font-size: ${v.tagFontSize};
  border-radius: ${v.tagBorderRadius};
}`;
}

// ==================== 控件值变化 → 合并到 customStyles ====================
function update(key: keyof typeof DEFAULTS, newVal: string) {
  values.value = { ...values.value, [key]: newVal };
  emitQuickAdjustCss(compileCss(values.value));
}

// ==================== 高级代码编辑 ====================
const codeValue = ref('');

// activeTab watch 的 emit 在 mounted 阶段会误触发，加标志拦截
const isPanelMounted = ref(false);
onMounted(() => { isPanelMounted.value = true; });

// 同步 extraStyles → quick tab 滑块值解析（不污染 codeValue）
watch(
  () => props.extraStyles,
  (newCss) => {
    if (activeTab.value === 'quick') {
      values.value = parseCss(newCss || '');
    }
  },
  { immediate: true }
);

// 同步 customStyles → code tab 编辑器（仅用户自定义部分）
watch(
  () => props.customStyles,
  (newCss) => {
    codeValue.value = newCss || '';
  },
  { immediate: true }
);

watch(activeTab, (tab) => {
  if (!isPanelMounted.value) return;
  if (tab === 'code' || tab === 'reference') {
    codeValue.value = props.customStyles || '';
  }
  // 切换到快速调整时不触发 emit — 滑块值已从 extraStyles 解析
  // 只有用户拖动滑块时（update()）才将结果合并到 customStyles
});

function handleCodeInput() {
  emit('update:customStyles', codeValue.value);
  if (activeTab.value === 'code') {
    try {
      values.value = parseCss(codeValue.value);
    } catch (_) { /* ignore */ }
  }
}

// ==================== Class 侧边栏 ====================
const classFilter = ref('');
const filteredClassNames = computed(() => {
  const q = classFilter.value.trim().toLowerCase();
  if (!q) return allClassNames;
  return allClassNames.filter(n => n.toLowerCase().includes(q));
});

function insertClass(className: string) {
  const template = `${className} {\n  \n}\n`;
  if (activeTab.value !== 'code') {
    activeTab.value = 'code';
  }
  codeValue.value = codeValue.value
    ? codeValue.value + '\n' + template
    : template;
  emit('update:customStyles', codeValue.value);
}

function insertClassAndSwitch(className: string) {
  activeTab.value = 'code';
  insertClass(className);
}

function copyClassName(className: string) {
  navigator.clipboard.writeText(className).then(() => {
    ElMessage.success(`已复制 ${className}`);
  }).catch(() => {
    ElMessage.info(className);
  });
}

// ==================== 预设样式 ====================
const presetBorderStyle = ref('none');
const presetColorScheme = ref('default');

function applyBorderPreset(style: string) {
  presetBorderStyle.value = style;
  let css = '';
  switch (style) {
    case 'none':
      css = '.section-title,\n.subsection-title {\n  border-bottom: none;\n  padding-bottom: 0;\n}';
      break;
    case 'thin':
      css = '.section-title,\n.subsection-title {\n  border-bottom: 1px solid #c96442;\n  padding-bottom: 4px;\n}';
      break;
    case 'thick':
      css = '.section-title,\n.subsection-title {\n  border-bottom: 3px solid #c96442;\n  padding-bottom: 6px;\n}';
      break;
    case 'left':
      css = '.section-title,\n.subsection-title {\n  border-bottom: none;\n  border-left: 4px solid #c96442;\n  padding-left: 12px;\n  padding-bottom: 0;\n}';
      break;
  }
  codeValue.value = css;
  emitQuickAdjustCss(css);
  activeTab.value = 'code';
}

function applyColorPreset(scheme: string) {
  presetColorScheme.value = scheme;
  let css = '';
  switch (scheme) {
    case 'default':
      css = '.section-title,\n.subsection-title {\n  color: #141413;\n}';
      break;
    case 'blue':
      css = '.section-title,\n.subsection-title {\n  color: #3898ec;\n}';
      break;
    case 'terracotta':
      css = '.section-title,\n.subsection-title {\n  color: #c96442;\n}';
      break;
  }
  codeValue.value = css;
  emitQuickAdjustCss(css);
  activeTab.value = 'code';
}

// ==================== 样式参考面板 ====================
const activeRefGroups = ref<string[]>(cssClassReference.map(g => g.group));
</script>

<style lang="scss" scoped>
.style-panel-root {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.style-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

:deep(.el-tabs__header) {
  flex-shrink: 0;
}

:deep(.el-tabs__content) {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding-right: 4px;
}

.quick-panel {
  padding: 4px 4px 24px;
}

.section-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-stone-gray);
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
  color: var(--color-near-black);
  margin-bottom: 4px;
}

.control-value {
  color: var(--color-terracotta);
  font-weight: 500;
  min-width: 36px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.code-panel {
  padding: 4px;
}

.code-panel-with-sidebar {
  display: flex;
  gap: 8px;
  height: 100%;
  padding: 4px;
}

.class-sidebar {
  width: 180px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.class-search {
  flex-shrink: 0;
}

.class-list-scroll {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-wrap: wrap;
  align-content: flex-start;
  gap: 4px;
  padding-right: 4px;
}

.class-chip {
  display: inline-block;
  padding: 2px 8px;
  font-size: 11px;
  font-family: var(--font-mono);
  color: var(--color-terracotta);
  background: var(--next-color-primary-lighter);
  border: 1px solid var(--color-border-cream);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.15s;
  white-space: nowrap;
}

.class-chip:hover {
  color: var(--color-white);
  background: var(--color-terracotta);
  border-color: var(--color-terracotta);
}

.code-editor-main {
  flex: 1;
  min-width: 0;
}

.code-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-warm-silver);
  margin-bottom: 12px;
  background: var(--color-parchment);
  padding: 8px 12px;
  border-radius: 6px;
}

.css-code-editor :deep(textarea) {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 12px;
  line-height: 1.6;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 6px;
}

/* ==================== 预设卡片 ==================== */

.preset-section {
  margin-bottom: 12px;
}

.preset-label {
  font-size: 12px;
  color: var(--color-warm-silver);
  margin-bottom: 6px;
}

.preset-row {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.color-preset-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all 0.15s;
  padding: 0;
  outline: none;
}

.color-preset-btn:hover {
  transform: scale(1.1);
}

.color-preset-btn.active {
  border-color: var(--color-near-black);
  box-shadow: 0 0 0 2px var(--color-ring-warm);
}

/* ==================== 样式参考面板 ==================== */

.reference-panel {
  padding: 4px;
}

.ref-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--color-warm-silver);
  margin-bottom: 12px;
  background: var(--color-parchment);
  padding: 8px 12px;
  border-radius: 6px;
}

.class-card {
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--color-ivory);
  border-radius: 6px;
  border: 1px solid var(--color-border-cream);
}

.class-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.class-name {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-terracotta);
  background: var(--next-color-primary-lighter);
  padding: 1px 6px;
  border-radius: 3px;
  cursor: pointer;
  transition: background 0.15s;
}

.class-name:hover {
  background: #f7c9bc;
}

.class-desc {
  font-size: 12px;
  color: var(--color-stone-gray);
  margin: 0 0 2px;
  line-height: 1.5;
}

.class-props {
  font-size: 11px;
  color: var(--color-warm-silver);
  margin: 0;
  font-family: var(--font-mono);
}

/* ==================== el-collapse 微调 ==================== */
.reference-panel :deep(.el-collapse-item__header) {
  font-size: 13px;
  font-weight: 600;
  color: var(--color-near-black);
}

.reference-panel :deep(.el-collapse-item__content) {
  padding-bottom: 4px;
}
</style>
