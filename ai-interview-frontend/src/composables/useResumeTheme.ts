import { ref, computed } from 'vue';
import { THEME_CSS_MAP, THEME_BLUE_CSS } from '@/styles/resumeThemeCss';

// ============================================================
// CSS Class 参考数据 — 供"样式参考"面板和侧边栏使用
// ============================================================
export interface CssClassEntry {
  name: string;
  desc: string;
  props: string;
}

export interface CssClassGroup {
  group: string;
  classes: CssClassEntry[];
}

export const cssClassReference: CssClassGroup[] = [
  {
    group: '容器',
    classes: [
      { name: '.resume-document', desc: '简历根容器，包裹所有内容', props: 'max-width, padding, margin, font-size, line-height, color, background, border-radius, box-shadow' },
    ],
  },
  {
    group: '标题',
    classes: [
      { name: '.resume-name', desc: '姓名标题（# 一级标题，h1）', props: 'font-size, font-weight, color, text-align, margin' },
      { name: '.section-title', desc: '区块标题（## 二级标题，h2）如"工作经历""教育背景"', props: 'font-size, font-weight, color, border-bottom, border-bottom-width, margin, padding' },
      { name: '.subsection-title', desc: '子标题（### ~ ######，h3-h6）如"基本信息""求职意向""专业技能"', props: 'font-size, font-weight, color, border-bottom, border-bottom-width, margin' },
      { name: '.project-title-text', desc: '项目标题文字（### 中 | 左侧部分）', props: 'font-size, font-weight, color' },
      { name: '.project-title-date', desc: '项目日期（### 中 | 右侧部分）', props: 'font-size, color' },
    ],
  },
  {
    group: '区块',
    classes: [
      { name: '.section', desc: '二级标题所属的 section 容器（h2）', props: 'margin-bottom, padding, border-bottom' },
      { name: '.section--work', desc: '工作经历区块（section-type="work"）', props: 'margin-bottom, border-bottom' },
      { name: '.section--projects', desc: '项目经验区块（section-type="projects"）', props: 'margin-bottom, border-bottom' },
      { name: '.section--education', desc: '教育背景区块（section-type="education"）', props: 'margin-bottom, border-bottom' },
      { name: '.section--skills', desc: '专业技能区块（section-type="skills"）', props: 'margin-bottom, border-bottom' },
      { name: '.section--summary', desc: '自我介绍区块（section-type="summary"）', props: 'margin-bottom, border-bottom' },
      { name: '.subsection', desc: '三级及以下标题所属的 div 容器', props: 'margin-bottom' },
    ],
  },
  {
    group: '列表容器',
    classes: [
      { name: '.item-list', desc: '通用列表（ul/ol 默认）', props: 'padding, margin, list-style, gap' },
      { name: '.work-list', desc: '工作经历列表', props: 'padding, margin, list-style, gap' },
      { name: '.project-list, .projects-list', desc: '项目经验列表', props: 'padding, margin, list-style, gap' },
      { name: '.education-list', desc: '教育背景列表', props: 'padding, margin, list-style, gap' },
      { name: '.skills-list', desc: '技能标签列表（flex-wrap 横向排列）', props: 'display, flex-wrap, gap, padding, list-style' },
      { name: '.summary-list', desc: '自我评价列表', props: 'padding, margin, list-style, gap' },
    ],
  },
  {
    group: '列表项',
    classes: [
      { name: '.item', desc: '通用列表项（li 默认）', props: 'margin-bottom, padding, border-left, list-style' },
      { name: '.work-item', desc: '工作经历条目', props: 'margin-bottom, padding, border-left' },
      { name: '.project-item', desc: '项目经验条目', props: 'margin-bottom, padding, border-left' },
      { name: '.education-item', desc: '教育背景条目', props: 'margin-bottom, padding, border-left' },
      { name: '.skill-item', desc: '技能标签（行内标签样式）', props: 'background-color, color, border, border-radius, padding, font-size' },
      { name: '.summary-item', desc: '自我评价条目', props: 'margin-bottom, color, line-height, white-space' },
    ],
  },
  {
    group: '列表项内部元素',
    classes: [
      { name: '.item-title, .work-item__title, .project-item__title, .education-item__title', desc: '条目标题（加粗）', props: 'font-size, font-weight, color' },
      { name: '.item-company, .work-item__company, .project-item__company', desc: '公司/组织名称', props: 'font-size, color' },
      { name: '.item-duration, .work-item__duration, .project-item__duration, .education-item__duration', desc: '时间段', props: 'font-size, color' },
      { name: '.item-role, .work-item__role, .project-item__role', desc: '职位/角色', props: 'font-size, color' },
      { name: '.item-location, .work-item__location, .project-item__location', desc: '地点', props: 'font-size, color' },
      { name: '.item-degree, .education-item__degree', desc: '学位', props: 'font-size, color' },
      { name: '.item-body, .work-item__body, .project-item__body, .education-item__body', desc: '条目正文容器', props: 'margin-top' },
      { name: '.item-description, .work-item__description, .project-item__description', desc: '条目描述子列表', props: 'margin, padding-left, list-style' },
      { name: '.item-header, .work-item__header, .project-item__header, .education-item__header', desc: '条目头部（flex 布局）', props: 'display, justify-content, gap, margin-bottom' },
    ],
  },
  {
    group: '基本信息',
    classes: [
      { name: '.basic-info-block', desc: '基本信息行容器（flex-wrap 居中）', props: 'display, justify-content, flex-wrap, gap, font-size, color, margin-bottom' },
      { name: '.basic-info-item', desc: '单个信息项（如电话、邮箱）', props: 'display, align-items, gap' },
    ],
  },
  {
    group: '内联文本',
    classes: [
      { name: '.paragraph', desc: '段落（p 标签）', props: 'color, font-size, line-height, margin-bottom' },
      { name: '.bold', desc: '加粗文本', props: 'font-weight' },
      { name: '.italic', desc: '斜体文本', props: 'font-style' },
      { name: '.strikethrough', desc: '删除线文本', props: 'text-decoration, color' },
      { name: '.link', desc: '超链接（a 标签）', props: 'color, text-decoration' },
      { name: '.summary-text', desc: '自我评价正文', props: 'color, line-height, white-space' },
    ],
  },
  {
    group: '引用与分隔',
    classes: [
      { name: '.blockquote', desc: '引用块（blockquote 标签）', props: 'border-left, border-left-color, background-color, color, padding, margin, font-style' },
      { name: '.divider', desc: '分隔线（hr 标签）', props: 'border, border-top, margin' },
    ],
  },
  {
    group: '代码块',
    classes: [
      { name: '.code-block', desc: '代码块容器（pre 标签）', props: 'background-color, border, border-color, border-radius, padding, margin' },
      { name: '.code', desc: '代码块内代码', props: 'font-family, font-size, color, white-space' },
      { name: '.inline-code', desc: '行内代码（code 标签）', props: 'background-color, color, padding, border, border-color, border-radius, font-family, font-size' },
    ],
  },
  {
    group: '表格',
    classes: [
      { name: '.table-wrapper', desc: '表格滚动容器', props: 'overflow-x, margin' },
      { name: '.table', desc: '表格（知网三线表）', props: 'border-collapse, border-top, border-bottom, font-size, width' },
      { name: '.table thead th', desc: '表头单元格', props: 'border-bottom, padding, text-align, font-weight, color' },
      { name: '.table tbody td', desc: '表体单元格', props: 'padding, border, color' },
      { name: '.table-row', desc: '表格行', props: 'border, background' },
      { name: '.table-cell', desc: '表格单元格', props: 'padding, text-align, border' },
      { name: '.table-cell--center', desc: '居中对齐单元格', props: 'text-align' },
      { name: '.table-cell--right', desc: '右对齐单元格', props: 'text-align' },
      { name: '.table-head', desc: '表头', props: 'background, font-weight' },
    ],
  },
  {
    group: '图片',
    classes: [
      { name: '.image-figure', desc: '图片容器（figure 标签）', props: 'margin, text-align' },
      { name: '.image', desc: '图片（img 标签）', props: 'max-width, height, border-radius, box-shadow' },
      { name: '.image-caption', desc: '图片说明（figcaption 标签）', props: 'font-size, color, margin-top' },
    ],
  },
];

// 扁平化所有 class 名（供侧边栏搜索用）
export const allClassNames: string[] = cssClassReference.flatMap(
  g => g.classes.map(c => c.name)
);

export function useResumeTheme() {
  const themeStyles = ref('');
  const customStyles = ref('');
  const extraStyles = computed(() => {
    const parts: string[] = [];
    if (themeStyles.value) parts.push(themeStyles.value);
    if (customStyles.value) parts.push(customStyles.value);
    return parts.join('\n');
  });

  function setTheme(themeId: string) {
    themeStyles.value = THEME_CSS_MAP[themeId] || THEME_BLUE_CSS;
    console.log('[useResumeTheme setTheme] themeId:', themeId, 'themeStyles 长度:', themeStyles.value.length);
  }

  function setCustomStyles(css: string) {
    customStyles.value = css;
    console.log('[useResumeTheme setCustomStyles] customStyles 长度:', css.length);
  }

  // 默认加载 theme-blue
  if (!themeStyles.value) {
    setTheme('classic');
  }

  return { themeStyles, customStyles, extraStyles, setTheme, setCustomStyles };
}
