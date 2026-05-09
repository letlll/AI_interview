/**
 * Resume CSS as a JS string constant.
 * This file is the SINGLE SOURCE OF TRUTH for resume CSS used in all rendering paths.
 *
 * When src/assets/styles/resume-markdown.css is updated:
 *   → copy its full content into RESUME_CSS below
 *   → no other files need changing
 *
 * Usage:
 *   import { RESUME_CSS } from '@/styles/resumeMarkdownCss';
 *   // RESUME_CSS is a plain string, safe to inject into HTML <style> tags
 */

export const RESUME_CSS = String.raw`/**
 * 简历 Markdown 渲染样式
 * 使用方式：import '@/assets/styles/resume-markdown.css';
 *
 * 结构约定：
 *   - .resume-document       → 最外层容器
 *   - .section              → 每个 ## 区块的外层容器
 *   - .section--work 等      → 按类型区分的 section
 *   - .section-title        → 可编辑的标题（配合 contenteditable）
 *   - .section-title--work 等 → 按类型区分的标题样式
 *   - .xxx-list             → 各类型列表
 *   - .xxx-item             → 各类型列表项
 *   - .xxx-header           → 列表项头部（公司/项目名 + 时间）
 *   - .xxx-body             → 列表项正文
 *   - .item-xxx             → 通用的列表项子元素
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
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  line-height: 1.75;
  font-size: 16px;
  background: var(--bg, #ffffff);
  color: var(--text-primary, #1f1f1f);
}

/* ============================================
   2. Section 通用容器
   ============================================ */
.section {
  margin-bottom: 32px;
  padding: 16px 0;
  border-bottom: 1px solid transparent;
  transition: background-color 0.2s ease;
  position: relative;
}

.section:last-child {
  margin-bottom: 0;
  border-bottom: none;
}

/* 按类型区分的 section */
.section--summary,
.section--skill,
.section--skills { border-bottom-color: var(--accent, #409eff); }

.section--work { border-bottom-color: var(--border-work, #b3e19d); }

.section--projects,
.section--project { border-bottom-color: var(--border-projects, #f4d03f); }

.section--education { border-bottom-color: var(--border-education, #8cc5ff); }

.section--custom { border-bottom-color: var(--border-custom, #e8e8e8); }

/* ============================================
   3. 标题样式
   ============================================ */

/* 通用标题 */
.section-title {
  font-size: 18px;
  font-weight: 600;
  color: inherit;
  margin: 0 0 16px 0;
  padding: 4px 8px;
  border-bottom: 2px solid #e8e8e8;
  outline: none;
  line-height: 1.4;
  display: block;
  min-height: 1.4em;
}

/* 按类型区分的标题样式 */
.section-title--summary,
.section-title--skill,
.section-title--skills {
  font-style: italic;
  color: #666666;
  border-bottom-style: dotted;
  border-bottom-color: var(--accent, #409eff);
}

.section-title--work { border-bottom-color: #b3e19d; }
.section-title--projects,
.section-title--project { border-bottom-color: #f4d03f; }
.section-title--education { border-bottom-color: #8cc5ff; }

/* 子 section（H3 及以下标题的容器） */
.subsection {
  margin-bottom: 16px;
}

.subsection:last-child {
  margin-bottom: 0;
}

/* 子标题样式（H3-H6） */
.subsection-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f1f1f;
  margin: 12px 0 8px;
  padding: 4px 8px;
  border-bottom: 1px dashed #e0e0e0;
  outline: none;
  line-height: 1.4;
  display: block;
  min-height: 1.4em;
}

.subsection-title[contenteditable="true"]:hover {
  background-color: #f5f7fa;
  border-bottom-color: var(--accent, #409eff);
  color: var(--accent, #409eff);
}

.subsection-title[contenteditable="true"]:focus {
  background-color: #ecf5ff;
  border: 1px solid var(--accent, #409eff);
  border-bottom: 1px solid var(--accent, #409eff);
  border-radius: 4px;
  padding: 4px 10px;
  outline: none;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.15);
}

/* 可编辑状态 */
.section-title[contenteditable="true"] {
  cursor: text;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.section-title[contenteditable="true"]:hover {
  background-color: #f5f7fa;
  border-bottom-color: var(--accent, #409eff);
  color: var(--accent, #409eff);
}

.section-title[contenteditable="true"]:focus {
  background-color: #ecf5ff;
  border: 2px solid var(--accent, #409eff);
  border-bottom: 2px solid var(--accent, #409eff);
  border-radius: 6px;
  padding: 4px 10px;
  outline: none;
  box-shadow: 0 0 0 3px rgba(64, 158, 255, 0.15);
}

/* h3-h6 子标题 */
/* h3-h6 子标题（按层级递减字号） */
.h3 {
  font-size: 16px;
  font-weight: 600;
  margin: 12px 0 8px;
  color: inherit;
}
.h4 {
  font-size: 15px;
  font-weight: 600;
  margin: 10px 0 6px;
  color: inherit;
}
.h5 {
  font-size: 14px;
  font-weight: 600;
  margin: 8px 0 4px;
  color: inherit;
}
.h6 {
  font-size: 13px;
  font-weight: 600;
  margin: 6px 0 4px;
  color: inherit;
}

/* ============================================
   4. 姓名（一级标题）
   ============================================ */
.resume-name {
  font-size: 32px;
  font-weight: 700;
  color: #1f1f1f;
  text-align: center;
  margin: 0 0 16px 0;
  padding-bottom: 12px;
  border-bottom: 2px solid var(--accent, #409eff);
}

.resume-name[contenteditable="true"]:hover {
  background-color: #f5f7fa;
  border-radius: 4px;
}

.resume-name[contenteditable="true"]:focus {
  background-color: #ecf5ff;
  border: 2px solid var(--accent, #409eff);
  border-radius: 6px;
  outline: none;
}

/* ============================================
   5. 基本信息行
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
}

.basic-info-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.basic-info-item span {
  cursor: text;
  padding: 2px 4px;
  border-radius: 3px;
  transition: background-color 0.2s;
}

.basic-info-item span:hover {
  background-color: #f5f7fa;
  color: var(--accent, #409eff);
}

/* ============================================
   6. 列表通用样式
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
  gap: 20px;
  padding: 0;
  list-style: none;
  margin: 0;
}

/* ============================================
   7. 技能标签
   ============================================ */
.skills-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.skill-item {
  background-color: #f0f2f5;
  color: #606266;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  padding: 4px 12px;
  font-size: 14px;
  line-height: 1.5;
}

/* ============================================
   8. 工作经历 / 项目经验 / 教育背景
   ============================================ */
.work-item,
.project-item,
.education-item,
.item {
  padding: 12px 0 12px 16px;
  border-left: 3px solid #e4e7ed;
  transition: border-color 0.2s;
}

.work-item:hover,
.project-item:hover,
.education-item:hover,
.item:hover {
  border-left-color: var(--accent, #409eff);
}

/* --- 列表项头部 --- */
.item-header,
.work-item__header,
.project-item__header,
.education-item__header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
  gap: 12px;
  flex-wrap: wrap;
}

.item-title,
.work-item__title,
.project-item__title,
.education-item__title {
  font-size: 16px;
  font-weight: 600;
  color: inherit;
}

.item-company,
.work-item__company,
.project-item__company {
  color: inherit;
  font-size: 14px;
  margin-bottom: 4px;
}

.item-duration,
.work-item__duration,
.project-item__duration,
.education-item__duration {
  color: inherit;
  font-size: 13px;
  flex-shrink: 0;
}

.item-role,
.work-item__role,
.project-item__role {
  color: inherit;
  font-size: 13px;
  margin-bottom: 4px;
  font-style: italic;
}

.item-location,
.work-item__location,
.project-item__location {
  color: inherit;
  font-size: 13px;
}

.item-degree,
.education-item__degree {
  color: inherit;
  font-size: 14px;
}

/* --- 列表项正文 --- */
.item-body,
.work-item__body,
.project-item__body,
.education-item__body {
  margin-top: 8px;
}

/* --- 描述列表 --- */
.item-description,
.work-item__description,
.project-item__description,
.item-list {
  margin: 8px 0 0 0;
  padding-left: 20px;
  list-style: disc;
}

.item-description li,
.work-item__description li,
.project-item__description li {
  color: inherit;
  line-height: 1.8;
  margin-bottom: 4px;
}

/* ============================================
   9. 自我评价 / 摘要
   ============================================ */
.summary-text,
.summary-item {
  color: inherit;
  line-height: 1.9;
  white-space: pre-wrap;
  padding: 8px 0;
}

/* ============================================
   10. 通用文本元素
   ============================================ */
.paragraph {
  color: inherit;
  line-height: 1.8;
  margin-bottom: 12px;
}

.bold { font-weight: 700; }
.italic { font-style: italic; }
.strikethrough { text-decoration: line-through; color: #999; }

/* 链接 */
.link {
  color: var(--accent, #409eff);
  text-decoration: none;
  transition: color 0.2s;
}
.link:hover {
  color: var(--accent-light, #66b1ff);
  text-decoration: underline;
}

/* 引用块 */
.blockquote {
  border-left: 4px solid var(--accent, #409eff);
  padding: 12px 16px;
  margin: 16px 0;
  background-color: #f5f7fa;
  color: #666666;
  font-style: italic;
}

/* 水平分隔线 */
.divider {
  border: none;
  border-top: 1px dashed #e8e8e8;
  margin: 24px 0;
}

/* ============================================
   11. 代码
   ============================================ */
.code-block {
  background-color: #282c34;
  border-radius: 6px;
  padding: 16px;
  margin: 16px 0;
  overflow-x: auto;
}

.code-block .code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
  color: #abb2bf;
  white-space: pre;
}

.inline-code {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  background-color: rgba(27, 31, 35, 0.05);
  color: #e06c75;
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid #e8e8e8;
}

/* ============================================
   12. 表格
   ============================================ */
.table-wrapper {
  overflow-x: auto;
  margin: 16px 0;
}

.table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.table-head {
  background-color: #f5f7fa;
  font-weight: 600;
}

.table-row {
  border-bottom: 1px solid #e8e8e8;
}

.table-row:hover {
  background-color: #fafafa;
}

.table-cell {
  padding: 10px 12px;
  text-align: left;
  border: 1px solid #e8e8e8;
}

.table-cell--center { text-align: center; }
.table-cell--right { text-align: right; }

/* ============================================
   13. 图片
   ============================================ */
.image-figure {
  margin: 16px 0;
  text-align: center;
}

.image {
  max-width: 100%;
  height: auto;
  border-radius: 4px;
}

.image-caption {
  font-size: 13px;
  color: #999;
  margin-top: 8px;
  font-style: italic;
}

/* ============================================
   14. 编辑状态指示
   ============================================ */
.is-editing::before {
  content: '编辑中';
  position: absolute;
  top: -10px;
  left: 8px;
  font-size: 11px;
  font-weight: 500;
  color: #ffffff;
  background: var(--accent, #409eff);
  padding: 1px 6px;
  border-radius: 3px;
  line-height: 1.6;
  z-index: 10;
  letter-spacing: 0.5px;
}

/* ============================================
   15. 滚动条美化
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
.resume-document h1 { color: var(--text-primary); border-bottom-color: var(--accent); }
.resume-document h2 { color: var(--text-primary); border-bottom-color: var(--border); }
.resume-document p,
.resume-document li { color: var(--text-secondary); }
.resume-document .item-duration { color: var(--text-muted); }

.resume-document [contenteditable="true"]:hover {
  background-color: var(--hover-bg);
}
.resume-document [contenteditable="true"]:focus {
  background-color: var(--focus-bg);
  box-shadow: 0 0 0 2px var(--accent-light);
}

/* resume-markdown.css */
.markdown-body {
  height: 100%;
  overflow: auto;
}
`;

export default RESUME_CSS;
