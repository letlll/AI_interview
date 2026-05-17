/**
 * Resume CSS as a JS string constant.
 * This file is the SINGLE SOURCE OF TRUTH for resume CSS used in all rendering paths.
 *
 * Both Markdown preview (MarkdownRenderer.vue) and PDF Electron (markdownToHtml)
 * use RESUME_CSS, ensuring visual consistency.
 *
 * 知网 GB/T 7713 论文规范 — 专业正式商务风格
 *
 * Usage:
 *   import { RESUME_CSS } from '@/styles/resumeMarkdownCss';
 *   // RESUME_CSS is a plain string, safe to inject into HTML <style> tags
 */

export const RESUME_CSS = String.raw`/**
 * 简历 Markdown 渲染样式 — 知网 GB/T 7713 论文规范
 *
 * 字体系统：黑体（标题）/ 微软雅黑（正文）/ Times New Roman（英文数字）
 * 五级层级：# → ## → ### | 日期 → #### → - **key**：value
 */

/* ============================================
   1. 文档容器
   ============================================ */
.resume-document {
  max-width: 800px;
  margin: 0 auto;
  padding: 40px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  min-height: 1000px;
  font-family: 'Microsoft YaHei', '微软雅黑', 'Times New Roman', serif;
  line-height: 1.5;
  font-size: 14px;
  background: var(--bg, #ffffff);
  color: #333333;
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
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
}

/* ============================================
   3. 论文题 — # 姓名（简历标题）
   ============================================ */
.resume-name {
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif !important;
  font-size: 22px;
  font-weight: 700;
  color: #333333;
  text-align: center;
  margin: 0 0 16px 0;
  padding-bottom: 0;
  border-bottom: none;
}

/* ============================================
   4. 一级标题 — ## 模块名（章节标题）
   知网规范：黑体 15px 加粗，段前 24px 段后 12px
   ============================================ */
.section-title {
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif !important;
  font-size: 15px;
  font-weight: 700;
  color: #333333;
  margin: 24px 0 12px 0;
  padding: 0;
  border-bottom: none;
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
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif !important;
  font-size: 14px;
  font-weight: 700;
  color: #333333;
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
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #333333;
}

.project-title-date {
  font-family: 'Times New Roman', serif;
  font-size: 12px;
  font-weight: 400;
  color: #999999;
  white-space: nowrap;
  flex-shrink: 0;
}

/* ============================================
   6. 三级标题 — #### 子标题
   知网规范：黑体 13px 加粗，段前 12px 段后 6px
   ============================================ */
.resume-document h4 {
  font-family: 'SimHei', '黑体', 'Microsoft YaHei', sans-serif !important;
  font-size: 13px;
  font-weight: 700;
  color: #333333;
  margin: 12px 0 6px 0;
  padding: 0;
  border-bottom: none;
}

/* ============================================
   7. 正文 — - **key**：value
   微软雅黑 + TNR，14px，行高 1.5，list-style disc 缩进 1.5em
   ============================================ */
.resume-document p,
.resume-document li {
  font-family: 'Microsoft YaHei', '微软雅黑', 'Times New Roman', serif;
  font-size: 14px;
  font-weight: 400;
  color: #333333;
  line-height: 1.5;
}

/* ============================================
   8. Section 容器
   ============================================ */
.section {
  margin-bottom: 24px;
  padding: 0;
  border-bottom: none;
  position: relative;
}

.section:last-child {
  margin-bottom: 0;
}

.subsection {
  margin-bottom: 12px;
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
  font-size: 14px;
  color: #666666;
  margin-bottom: 24px;
  text-align: center;
  font-family: 'Times New Roman', 'Microsoft YaHei', '微软雅黑', serif;
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
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 0 0 0 1.5em;
  list-style: disc;
  margin: 0;
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
  background-color: #f5f5f5;
  color: #666666;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 2px 10px;
  font-size: 13px;
  line-height: 1.5;
  list-style: none;
}

/* ============================================
   12. 工作经历 / 项目经验 / 教育背景 列表项
   无 border-left 竖杠，用 ::before 圆点替代
   ============================================ */
.work-item,
.project-item,
.education-item,
.item {
  padding: 0;
  border-left: none;
  list-style: disc;
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
  font-family: 'SimHei', '黑体', sans-serif;
  font-size: 14px;
  font-weight: 700;
  color: #333333;
}

.item-company,
.work-item__company,
.project-item__company {
  font-size: 14px;
  color: #666666;
  margin-bottom: 2px;
}

.item-duration,
.work-item__duration,
.project-item__duration,
.education-item__duration {
  font-family: 'Times New Roman', serif;
  font-size: 12px;
  color: #999999;
  flex-shrink: 0;
}

.item-role,
.work-item__role,
.project-item__role {
  font-size: 13px;
  color: #666666;
  margin-bottom: 2px;
}

.item-location,
.work-item__location,
.project-item__location {
  font-size: 13px;
  color: #999999;
}

.item-degree,
.education-item__degree {
  font-size: 14px;
  color: #333333;
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
  padding-left: 1.5em;
  list-style: disc;
}

.item-description li,
.work-item__description li,
.project-item__description li {
  color: #333333;
  line-height: 1.5;
  margin-bottom: 2px;
}

/* ============================================
   13. 自我评价 / 摘要
   ============================================ */
.summary-text,
.summary-item {
  color: #333333;
  line-height: 1.5;
  white-space: pre-wrap;
  padding: 4px 0;
}

/* ============================================
   14. 通用文本元素
   ============================================ */
.paragraph {
  color: #333333;
  line-height: 1.5;
  margin-bottom: 8px;
}

.bold { font-weight: 700; }
.italic { font-style: italic; }
.strikethrough { text-decoration: line-through; color: #999999; }

/* 链接 */
.link {
  color: #333333;
  text-decoration: none;
}
.link:hover {
  text-decoration: underline;
}

/* 引用块 */
.blockquote {
  border-left: 3px solid #cccccc;
  padding: 8px 16px;
  margin: 12px 0;
  background-color: #fafafa;
  color: #666666;
  font-style: normal;
}

/* 水平分隔线 */
.divider {
  border: none;
  border-top: 1px solid #e0e0e0;
  margin: 16px 0;
}

/* ============================================
   15. 代码
   ============================================ */
.code-block {
  background-color: #f5f5f5;
  border: 1px solid #e0e0e0;
  border-radius: 3px;
  padding: 12px;
  margin: 12px 0;
  overflow-x: auto;
}

.code-block .code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  color: #333333;
  white-space: pre;
}

.inline-code {
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  background-color: #f5f5f5;
  color: #333333;
  padding: 1px 4px;
  border: 1px solid #e0e0e0;
  border-radius: 2px;
}

/* ============================================
   16. 表格 — 知网三线表
   顶线 1.5px / 表头下线 0.75px / 底线 1.5px
   无竖线，无背景色
   ============================================ */
.table-wrapper {
  overflow-x: auto;
  margin: 12px 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  border-top: 1.5px solid #333333;
  border-bottom: 1.5px solid #333333;
  border-left: none;
  border-right: none;
  font-size: 13px;
}

.table thead th {
  border-bottom: 0.75px solid #666666;
  border-left: none;
  border-right: none;
  border-top: none;
  padding: 6px 8px;
  text-align: left;
  font-weight: 700;
  color: #333333;
  background: none;
}

.table tbody td {
  padding: 6px 8px;
  border: none;
  color: #333333;
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
  border-radius: 2px;
}

.image-caption {
  font-size: 12px;
  color: #999999;
  margin-top: 6px;
}

/* ============================================
   18. 可编辑状态
   ============================================ */
.section-title[contenteditable="true"] {
  cursor: text;
  border-radius: 2px;
  transition: background-color 0.15s;
}

.section-title[contenteditable="true"]:hover {
  background-color: #f5f5f5;
}

.section-title[contenteditable="true"]:focus {
  background-color: #f0f0f0;
  outline: 1px solid #cccccc;
  outline-offset: 2px;
}

.subsection-title[contenteditable="true"]:hover {
  background-color: #f5f5f5;
}

.subsection-title[contenteditable="true"]:focus {
  background-color: #f0f0f0;
  outline: 1px solid #cccccc;
  outline-offset: 2px;
}

.resume-name[contenteditable="true"]:hover {
  background-color: #f5f5f5;
  border-radius: 2px;
}

.resume-name[contenteditable="true"]:focus {
  background-color: #f0f0f0;
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
   基础变量（所有主题共享）
   ============================================ */
.resume-document {
  max-width: 800px;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  background: var(--bg, #ffffff);
  color: var(--text-primary, #1f1f1f);
}

/* ============================================
   颜色变量（按主题切换 .resume-document 的 class）
   ============================================ */

/* 主题：专业蓝（默认）*/
.resume-document.theme-blue {
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

/* 主题：暗色 */
.resume-document.theme-dark {
  --accent: #58a6ff;
  --accent-light: #79c0ff;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --text-muted: #6e7681;
  --bg: #161b22;
  --border: #30363d;
  --hover-bg: #21262d;
  --focus-bg: rgba(56, 139, 253, 0.15);
  --tag-bg: #21262d;
  --border-work: #3fb950;
  --border-projects: #d29922;
  --border-education: #79c0ff;
  --border-custom: #30363d;
}

/* 主题：极简灰 */
.resume-document.theme-minimal {
  --accent: #333333;
  --accent-light: #666666;
  --text-primary: #1a1a1a;
  --text-secondary: #555555;
  --text-muted: #888888;
  --bg: #ffffff;
  --border: #e0e0e0;
  --hover-bg: #f8f8f8;
  --focus-bg: #f0f0f0;
  --tag-bg: #f5f5f5;
  --border-work: #999999;
  --border-projects: #bbbbbb;
  --border-education: #aaaaaa;
  --border-custom: #e0e0e0;
}

/* 主题：经典黑白 */
.resume-document.theme-classic {
  --accent: #1a1a1a;
  --accent-light: #4a4a4a;
  --text-primary: #000000;
  --text-secondary: #333333;
  --text-muted: #666666;
  --bg: #ffffff;
  --border: #000000;
  --hover-bg: #f5f5f5;
  --focus-bg: #eeeeee;
  --tag-bg: #f0f0f0;
  --border-work: #000000;
  --border-projects: #333333;
  --border-education: #666666;
  --border-custom: #000000;
  box-shadow: none;
}

/* 主题：现代紫 */
.resume-document.theme-modern {
  --accent: #7c3aed;
  --accent-light: #a78bfa;
  --text-primary: #1f1f1f;
  --text-secondary: #6b7280;
  --text-muted: #9ca3af;
  --bg: #ffffff;
  --border: #ede9fe;
  --hover-bg: #f5f3ff;
  --focus-bg: #ede7f6;
  --tag-bg: #f3e8ff;
  --border-work: #7c3aed;
  --border-projects: #a78bfa;
  --border-education: #c4b5fd;
  --border-custom: #ede9fe;
}

/* ============================================
   所有元素的颜色使用变量
   ============================================ */
.resume-document { color: var(--text-primary); background: var(--bg); }
.resume-document h1 { color: var(--text-primary); }
.resume-document h2 { color: var(--text-primary); }
.resume-document p,
.resume-document li { color: var(--text-secondary); }
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
