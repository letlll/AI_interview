/**
 * Resume CSS as a JS string constant.
 * This file is the SINGLE SOURCE OF TRUTH for resume CSS used in all rendering paths.
 *
 * Both Markdown preview (MarkdownRenderer.vue) and PDF Electron (markdownToHtml)
 * use RESUME_CSS, ensuring visual consistency.
 *
 * 知网 GB/T 7713 论文规范 — 专业正式商务风格
 * 主题系统：CSS Design Tokens（~35 个变量覆盖颜色/阴影/圆角/间距/字体/边框/标签形状）
 *
 * Usage:
 *   import { RESUME_CSS } from '@/styles/resumeMarkdownCss';
 *   // RESUME_CSS is a plain string, safe to inject into HTML <style> tags
 */

export const RESUME_CSS = String.raw`/**
 * 简历 Markdown 渲染样式 — 知网 GB/T 7713 论文规范
 *
 * 字体系统：黑体（标题）/ 宋体（正文）/ Times New Roman（英文数字）
 * 五级层级：# → ## → ### | 日期 → #### → - **key**：value
 * 主题令牌：所有可差异化的属性通过 CSS 变量控制，每个主题块重定义变量
 */

/* ============================================
   0. 默认设计令牌（所有主题继承）
   每个主题块可覆盖任意变量来差异化视觉
   ============================================ */
.resume-document {
  /* 阴影 */
  --shadow-doc: 0 2px 12px rgba(0, 0, 0, 0.08);
  --shadow-image: none;

  /* 圆角 */
  --radius-doc: 8px;
  --radius-sm: 3px;
  --radius-md: 6px;

  /* 间距密度 */
  --spacing-doc-padding: 40px;
  --spacing-section-gap: 24px;
  --spacing-subsection-gap: 12px;
  --spacing-item-gap: 4px;
  --spacing-paragraph-gap: 8px;
  --list-indent: 1.5em;

  /* 字体栈 */
  --font-body: 'SimSun', '宋体', 'Times New Roman', serif;
  --font-heading: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
  --font-english: 'Times New Roman', serif;
  --font-mono: 'Consolas', 'Monaco', 'Courier New', monospace;

  /* 字号 */
  --font-size-base: 14px;
  --font-size-name: 22px;
  --font-size-h2: 15px;
  --font-size-h3: 14px;
  --font-size-h4: 13px;
  --font-size-small: 12px;
  --font-size-tag: 13px;

  /* 行高 */
  --line-height: 1.5;

  /* 区块标题边框 */
  --border-section-width: 0;
  --border-section-style: solid;
  --border-section-color: transparent;

  /* 分隔线 */
  --border-divider-style: solid;
  --border-divider-color: #e0e0e0;

  /* 三线表 */
  --border-table-top: 1.5px;
  --border-table-head: 0.75px;

  /* 引用块 */
  --blockquote-border-width: 3px;
  --blockquote-border-color: #cccccc;
  --blockquote-bg: #fafafa;

  /* 技能标签 */
  --skill-radius: 3px;
  --skill-border: 1px solid #e0e0e0;
  --skill-bg: #f5f5f5;

  /* 列表符号 */
  --list-marker: disc;

  /* 姓名对齐 */
  --name-align: center;

  /* 颜色（默认 theme-blue 值） */
  --accent: #409eff;
  --accent-light: #66b1ff;
  --text-primary: #1f1f1f;
  --text-secondary: #666666;
  --text-muted: #999999;
  --bg: #ffffff;
  --border: #e8e8e8;
  --hover-bg: #f5f7fa;
  --focus-bg: #ecf5ff;
  --tag-bg: #f0f2f5;
  --border-work: #b3e19d;
  --border-projects: #f4d03f;
  --border-education: #8cc5ff;
  --border-custom: #e8e8e8;
}

/* ============================================
   1. 文档容器
   ============================================ */
.resume-document {
  max-width: 800px;
  margin: 0 auto;
  padding: var(--spacing-doc-padding, 40px);
  box-shadow: var(--shadow-doc, 0 2px 12px rgba(0, 0, 0, 0.08));
  border-radius: var(--radius-doc, 8px);
  min-height: 1000px;
  font-family: var(--font-body, 'SimSun', '宋体', 'Times New Roman', serif);
  line-height: var(--line-height, 1.5);
  font-size: var(--font-size-base, 14px);
  background: var(--bg, #ffffff);
  color: var(--text-primary, #1f1f1f);
  transition: box-shadow 0.3s ease, border-radius 0.3s ease, background-color 0.3s ease, color 0.3s ease, padding 0.3s ease;
}

/* ============================================
   2. 字体系统
   ============================================ */
.resume-document h1,
.resume-document h2,
.resume-document h3,
.resume-document h4,
.resume-document h5,
.resume-document h6 {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif);
}

/* ============================================
   3. 论文题 — # 姓名（简历标题）
   ============================================ */
.resume-name {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif) !important;
  font-size: var(--font-size-name, 22px);
  font-weight: 700;
  color: var(--text-primary, #333333);
  text-align: var(--name-align, center);
  margin: 0 0 16px 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* ============================================
   4. 一级标题 — ## 模块名（章节标题）
   知网规范：黑体 15px 加粗，段前 24px 段后 12px
   ============================================ */
.section-title {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif) !important;
  font-size: var(--font-size-h2, 15px);
  font-weight: 700;
  color: var(--text-primary, #333333);
  margin: var(--spacing-section-gap, 24px) 0 12px 0;
  padding: 0;
  border-bottom: var(--border-section-width, 0) var(--border-section-style, solid) var(--border-section-color, transparent);
  outline: none;
  line-height: 1.4;
  display: block;
  min-height: 1.4em;
}

/* ============================================
   5. 二级标题 — ### 项目名 | 日期（项目标题）
   知网规范：黑体 14px 加粗，段前 18px 段后 8px
   右侧日期：Times New Roman 12px 灰色 右对齐
   ============================================ */
.subsection-title {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif) !important;
  font-size: var(--font-size-h3, 14px);
  font-weight: 700;
  color: var(--text-primary, #333333);
  margin: 18px 0 8px 0;
  padding: 0;
  border-bottom: none;
  outline: none;
  line-height: 1.4;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  min-height: 1.4em;
}

.project-title-text {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif);
  font-size: var(--font-size-h3, 14px);
  font-weight: 700;
  color: var(--text-primary, #333333);
}

.project-title-date {
  font-family: var(--font-english, 'Times New Roman', serif);
  font-size: var(--font-size-small, 12px);
  font-weight: 400;
  color: var(--text-muted, #999999);
  white-space: nowrap;
  flex-shrink: 0;
}

/* ============================================
   6. 三级标题 — #### 子标题
   知网规范：黑体 13px 加粗，段前 12px 段后 6px
   ============================================ */
.resume-document h4 {
  font-family: var(--font-heading, 'SimHei', '黑体', 'Microsoft YaHei', sans-serif) !important;
  font-size: var(--font-size-h4, 13px);
  font-weight: 700;
  color: var(--text-primary, #333333);
  margin: 12px 0 6px 0;
  padding: 0;
  border-bottom: none;
}

/* ============================================
   7. 正文 — - **key**：value
   宋体 + TNR，14px，行高 1.5，list-style disc 缩进 1.5em
   ============================================ */
.resume-document p,
.resume-document li {
  font-family: var(--font-body, 'SimSun', '宋体', 'Times New Roman', serif);
  font-size: var(--font-size-base, 14px);
  font-weight: 400;
  color: var(--text-primary, #333333);
  line-height: var(--line-height, 1.5);
}

/* ============================================
   8. Section 容器
   ============================================ */
.section {
  margin-bottom: var(--spacing-section-gap, 24px);
  padding: 0;
  border-bottom: none;
  position: relative;
}

.section:last-child {
  margin-bottom: 0;
}

.subsection {
  margin-bottom: var(--spacing-subsection-gap, 12px);
}

.subsection:last-child {
  margin-bottom: 0;
}

/* ============================================
   9. 基本信息行
   ============================================ */
.basic-info-block {
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
  gap: 16px 24px;
  font-size: var(--font-size-base, 14px);
  color: var(--text-secondary, #666666);
  margin-bottom: var(--spacing-section-gap, 24px);
  text-align: center;
  font-family: var(--font-english, 'Times New Roman'), var(--font-body, 'SimSun', '宋体', serif);
}

.basic-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

/* ============================================
   10. 列表通用样式
   ============================================ */
.skills-list,
.summary-list,
.work-list,
.projects-list,
.project-list,
.education-list,
.item-list {
  padding: 0 0 0 var(--list-indent, 1.5em);
  margin: 0;
}

/* 无序列表 */
.summary-list,
.work-list,
.projects-list,
.project-list,
.education-list,
.item-list {
  list-style: var(--list-marker, disc);
}

/* 有序列表：浏览器默认编号（1, 2, 3...） */
ol.skills-list,
ol.summary-list,
ol.work-list,
ol.projects-list,
ol.project-list,
ol.education-list,
ol.item-list {
  list-style: decimal;
}

/* 列表项间距 */
.work-item,
.project-item,
.education-item,
.item,
.summary-item {
  margin-bottom: var(--spacing-item-gap, 4px);
}
.work-item:last-child,
.project-item:last-child,
.education-item:last-child,
.item:last-child,
.summary-item:last-child {
  margin-bottom: 0;
}

/* ============================================
   11. 技能标签
   ============================================ */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  gap: 8px;
  padding: 0;
  list-style: none;
}

.skill-item {
  background-color: var(--skill-bg, #f5f5f5);
  color: var(--text-secondary, #666666);
  border: var(--skill-border, 1px solid #e0e0e0);
  border-radius: var(--skill-radius, 3px);
  padding: 2px 10px;
  font-size: var(--font-size-tag, 13px);
  line-height: 1.5;
  list-style: none;
}

/* ============================================
   12. 工作经历 / 项目经验 / 教育背景 列表项
   无 border-left 竖杠，用 list-style 控制符号
   ============================================ */
.work-item,
.project-item,
.education-item,
.item {
  padding: 0;
  border-left: none;
  list-style: var(--list-marker, disc);
}

/* --- 列表项头部 --- */
.item-header,
.work-item__header,
.project-item__header,
.education-item__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 4px;
  gap: 12px;
  flex-wrap: wrap;
}

.item-title,
.work-item__title,
.project-item__title,
.education-item__title {
  font-family: var(--font-heading, 'SimHei', '黑体', sans-serif);
  font-size: var(--font-size-base, 14px);
  font-weight: 700;
  color: var(--text-primary, #333333);
}

.item-company,
.work-item__company,
.project-item__company {
  font-size: var(--font-size-base, 14px);
  color: var(--text-secondary, #666666);
  margin-bottom: 2px;
}

.item-duration,
.work-item__duration,
.project-item__duration,
.education-item__duration {
  font-family: var(--font-english, 'Times New Roman', serif);
  font-size: var(--font-size-small, 12px);
  color: var(--text-muted, #999999);
  flex-shrink: 0;
}

.item-role,
.work-item__role,
.project-item__role {
  font-size: 13px;
  color: var(--text-secondary, #666666);
  margin-bottom: 2px;
}

.item-location,
.work-item__location,
.project-item__location {
  font-size: 13px;
  color: var(--text-muted, #999999);
}

.item-degree,
.education-item__degree {
  font-size: var(--font-size-base, 14px);
  color: var(--text-primary, #333333);
}

/* --- 列表项正文 --- */
.item-body,
.work-item__body,
.project-item__body,
.education-item__body {
  margin-top: 4px;
}

/* --- 描述列表 --- */
.item-description,
.work-item__description,
.project-item__description,
.item-list {
  margin: 4px 0 0 0;
  padding-left: var(--list-indent, 1.5em);
  list-style: var(--list-marker, disc);
}

.item-description li,
.work-item__description li,
.project-item__description li {
  color: var(--text-primary, #333333);
  line-height: var(--line-height, 1.5);
  margin-bottom: 2px;
}

/* ============================================
   13. 自我评价 / 摘要
   ============================================ */
.summary-text,
.summary-item {
  color: var(--text-primary, #333333);
  line-height: var(--line-height, 1.5);
  white-space: pre-wrap;
  padding: 4px 0;
}

/* ============================================
   14. 通用文本元素
   ============================================ */
.paragraph {
  color: var(--text-primary, #333333);
  line-height: var(--line-height, 1.5);
  margin-bottom: var(--spacing-paragraph-gap, 8px);
}

.bold { font-weight: 700; }
.italic { font-style: italic; }
.strikethrough { text-decoration: line-through; color: var(--text-muted, #999999); }

/* 链接 */
.link {
  color: var(--text-primary, #333333);
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

/* 引用块 */
.blockquote {
  border-left: var(--blockquote-border-width, 3px) solid var(--blockquote-border-color, #cccccc);
  padding: 8px 16px;
  margin: 12px 0;
  background-color: var(--blockquote-bg, #fafafa);
  color: var(--text-secondary, #666666);
  font-style: normal;
}

/* 水平分隔线 */
.divider {
  border: none;
  border-top: 1px var(--border-divider-style, solid) var(--border-divider-color, #e0e0e0);
  margin: 16px 0;
}

/* ============================================
   15. 代码
   ============================================ */
.code-block {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm, 3px);
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
}

.code-block .code {
  font-family: var(--font-mono, 'Consolas', 'Monaco', 'Courier New', monospace);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-primary, #333333);
  white-space: pre;
}

.inline-code {
  font-family: var(--font-mono, 'Consolas', 'Monaco', 'Courier New', monospace);
  font-size: 0.9em;
  background-color: #f5f5f5;
  color: var(--text-primary, #333333);
  padding: 1px 4px;
  border: 1px solid #e0e0e0;
  border-radius: var(--radius-sm, 3px);
}

/* ============================================
   16. 表格 — 知网三线表
   顶线 / 表头下线 / 底线
   无竖线，无背景色
   ============================================ */
.table-wrapper {
  overflow-x: auto;
  margin: 12px 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  border-top: var(--border-table-top, 1.5px) solid var(--text-primary, #333333);
  border-bottom: var(--border-table-top, 1.5px) solid var(--text-primary, #333333);
  border-left: none;
  border-right: none;
  font-size: 13px;
}

.table thead th {
  border-bottom: var(--border-table-head, 0.75px) solid var(--text-secondary, #666666);
  border-left: none;
  border-right: none;
  border-top: none;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  color: var(--text-primary, #333333);
  background: none;
}

.table tbody td {
  padding: 6px 8px;
  border: none;
  color: var(--text-primary, #333333);
}

.table-row {
  border: none;
  background: none;
}

.table-row:hover {
  background: none;
}

.table-cell {
  padding: 6px 8px;
  text-align: left;
  border: none;
}

.table-cell--center { text-align: center; }
.table-cell--right { text-align: right; }

.table-head {
  background: none;
  font-weight: 700;
}

/* ============================================
   17. 图片
   ============================================ */
.image-figure {
  margin: 12px 0;
  text-align: center;
}

.image {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm, 3px);
  box-shadow: var(--shadow-image, none);
}

.image-caption {
  font-size: var(--font-size-small, 12px);
  color: var(--text-muted, #999999);
  margin-top: 6px;
}

/* ============================================
   18. 可编辑状态
   ============================================ */
.section-title[contenteditable="true"] {
  cursor: text;
  border-radius: var(--radius-sm, 3px);
  transition: background-color 0.15s;
}

.section-title[contenteditable="true"]:hover {
  background-color: var(--hover-bg, #f5f5f5);
}

.section-title[contenteditable="true"]:focus {
  background-color: var(--focus-bg, #f0f0f0);
  outline: 1px solid #cccccc;
  outline-offset: 2px;
}

.subsection-title[contenteditable="true"]:hover {
  background-color: var(--hover-bg, #f5f5f5);
}

.subsection-title[contenteditable="true"]:focus {
  background-color: var(--focus-bg, #f0f0f0);
  outline: 1px solid #cccccc;
  outline-offset: 2px;
}

.resume-name[contenteditable="true"]:hover {
  background-color: var(--hover-bg, #f5f5f5);
  border-radius: var(--radius-sm, 3px);
}

.resume-name[contenteditable="true"]:focus {
  background-color: var(--focus-bg, #f0f0f0);
  outline: 1px solid #cccccc;
  outline-offset: 2px;
  border: none;
}

/* ============================================
   19. 编辑状态指示
   ============================================ */
.is-editing::before {
  content: '编辑中';
  position: absolute;
  top: -10px;
  left: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #ffffff;
  background: #666666;
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.6;
  z-index: 10;
  letter-spacing: 0.5px;
}

/* ============================================
   20. 滚动条
   ============================================ */
.resume-document::-webkit-scrollbar {
  width: 6px;
}
.resume-document::-webkit-scrollbar-track {
  background: transparent;
}
.resume-document::-webkit-scrollbar-thumb {
  background: #dcdfe6;
  border-radius: 3px;
}
.resume-document::-webkit-scrollbar-thumb:hover {
  background: #c0c4cc;
}

/* ============================================
   主题块 — 每个主题重定义设计令牌来差异化视觉性格
   默认令牌已在第 0 节定义（theme-blue 值），各主题只覆盖差异
   ============================================ */

/* ---- theme-blue（默认/专业蓝）----
   继承所有默认令牌，无需额外覆盖 */
.resume-document.theme-blue {
  /* 所有令牌使用第 0 节默认值 */
}

/* ---- theme-dark（暗色）----
   暗底 + 强阴影 + 低对比 */
.resume-document.theme-dark {
  /* 阴影 */ --shadow-doc: 0 4px 24px rgba(0, 0, 0, 0.5);
  /* 颜色 */ --accent: #58a6ff; --accent-light: #79c0ff;
            --text-primary: #e6edf3; --text-secondary: #8b949e; --text-muted: #6e7681;
            --bg: #161b22; --border: #30363d;
            --hover-bg: #21262d; --focus-bg: rgba(56, 139, 253, 0.15);
            --tag-bg: #21262d;
            --border-work: #3fb950; --border-projects: #d29922; --border-education: #79c0ff;
            --border-custom: #30363d;
  /* 引用块 */ --blockquote-border-color: #30363d; --blockquote-bg: #21262d;
  /* 技能 */ --skill-bg: #21262d; --skill-border: 1px solid #30363d;
  /* 分隔线 */ --border-divider-color: #30363d;
}

/* ---- theme-minimal（极简灰）----
   无阴影 + 无圆角 + 无线条 + 宽松间距 */
.resume-document.theme-minimal {
  /* 阴影 */ --shadow-doc: none;
  /* 圆角 */ --radius-doc: 0; --radius-sm: 0; --radius-md: 0;
  /* 间距 */ --spacing-doc-padding: 60px; --spacing-section-gap: 32px;
  /* 标题 */ --border-section-width: 0;
  /* 技能 */ --skill-radius: 0; --skill-border: none; --skill-bg: #f0f0f0;
  /* 颜色 */ --accent: #333333; --accent-light: #666666;
            --text-primary: #1a1a1a; --text-secondary: #555555; --text-muted: #888888;
            --bg: #ffffff; --border: #e0e0e0;
            --hover-bg: #f8f8f8; --focus-bg: #f0f0f0; --tag-bg: #f5f5f5;
            --border-work: #999999; --border-projects: #bbbbbb; --border-education: #aaaaaa;
            --border-custom: #e0e0e0;
  /* 引用块 */ --blockquote-border-color: #e0e0e0; --blockquote-bg: transparent;
  /* 分隔线 */ --border-divider-color: #e0e0e0;
}

/* ---- theme-classic（经典黑白）----
   衬线字体 + 传统分隔线 + 小圆角 + 紧凑 + 无阴影 */
.resume-document.theme-classic {
  /* 阴影 */ --shadow-doc: none;
  /* 圆角 */ --radius-doc: 2px; --radius-sm: 1px; --radius-md: 4px;
  /* 间距 */ --spacing-doc-padding: 36px; --spacing-section-gap: 20px;
  /* 字体 */ --font-body: 'Georgia', 'SimSun', '宋体', serif;
            --font-heading: 'Georgia', 'SimHei', '黑体', serif;
  /* 标题 */ --border-section-width: 1px; --border-section-color: #000000;
  /* 表格 */ --border-table-top: 2px; --border-table-head: 1px;
  /* 技能 */ --skill-radius: 2px;
  /* 颜色 */ --accent: #1a1a1a; --accent-light: #4a4a4a;
            --text-primary: #000000; --text-secondary: #333333; --text-muted: #666666;
            --bg: #ffffff; --border: #000000;
            --hover-bg: #f5f5f5; --focus-bg: #eeeeee; --tag-bg: #f0f0f0;
            --border-work: #000000; --border-projects: #333333; --border-education: #666666;
            --border-custom: #000000;
  /* 引用块 */ --blockquote-border-color: #000000; --blockquote-bg: #f9f9f9;
  /* 分隔线 */ --border-divider-style: double; --border-divider-color: #000000;
  box-shadow: none;
}

/* ---- theme-modern（现代紫）----
   大圆角 + 彩色阴影 + accent 装饰线 + 药丸标签 + 无衬线标题 */
.resume-document.theme-modern {
  /* 阴影 */ --shadow-doc: 0 4px 24px rgba(124, 58, 237, 0.12);
  /* 圆角 */ --radius-doc: 12px; --radius-sm: 6px; --radius-md: 8px;
  /* 字体 */ --font-heading: 'Inter', 'SF Pro Display', 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
  /* 标题 */ --border-section-width: 2px; --border-section-color: var(--accent, #7c3aed);
  /* 技能 */ --skill-radius: 20px; --skill-bg: #f5f3ff;
            --skill-border: 1px solid #ede9fe;
  /* 颜色 */ --accent: #7c3aed; --accent-light: #a78bfa;
            --text-primary: #1f1f1f; --text-secondary: #6b7280; --text-muted: #9ca3af;
            --bg: #ffffff; --border: #ede9fe;
            --hover-bg: #f5f3ff; --focus-bg: #ede7f6; --tag-bg: #f3e8ff;
            --border-work: #7c3aed; --border-projects: #a78bfa; --border-education: #c4b5fd;
            --border-custom: #ede9fe;
  /* 引用块 */ --blockquote-border-color: #8b5cf6; --blockquote-bg: #f5f3ff;
  /* 分隔线 */ --border-divider-color: #ede9fe;
}

/* ============================================
   CSS 变量最终应用（颜色变量统一在此处使用）
   ============================================ */
.resume-document { color: var(--text-primary); background: var(--bg); }
.resume-document h1 { color: var(--text-primary); }
.resume-document h2 { color: var(--text-primary); }
.resume-document p,
.resume-document li { color: var(--text-primary); }
.resume-document .item-duration { color: var(--text-muted); }

.resume-document [contenteditable="true"]:hover {
  background-color: var(--hover-bg);
}
.resume-document [contenteditable="true"]:focus {
  background-color: var(--focus-bg);
}

/* resume-markdown.css */
.markdown-body {
  height: 100%;
  overflow: auto;
}
`;

export default RESUME_CSS;
