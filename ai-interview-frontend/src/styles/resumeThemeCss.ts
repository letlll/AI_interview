/**
 * 5 个简历主题的 Complete CSS — 覆盖 Markdown→HTML 映射后的全部内部元素。
 *
 * 禁止修改 .resume-document 外层容器（box-shadow/border-radius/padding 由 RESUME_CSS 基线固定）。
 * 主题只改：颜色方案 / 区块标题装饰线 / 技能标签 / 表格 / 代码块 / 引用块 / 字体栈。
 *
 * 通过 extraStyles（themeStyles 字段）注入，排在 RESUME_CSS 之后自然覆盖。
 */

export const THEME_BLUE_CSS = `/* theme-blue — 商务专业蓝（优化版） */
.resume-document {
  color: #1f2937; /* 更深的正文灰，阅读更舒适 */
  background: #ffffff;
  font-family: "Microsoft YaHei", "SimHei", sans-serif; /* 统一正式字体 */
  line-height: 1.6;
}

/* —— 标题：强化层级 + 商务蓝强调 —— */
.resume-name { 
  color: #1f2937; 
  font-weight: 700; /* 姓名加粗更正式 */
}
.section-title { 
  border-bottom: 2px solid #165DFF; /* 核心：蓝色下划线分区 */
  color: #1f2937; 
  font-weight: 600;
  padding-bottom: 4px;
  margin-bottom: 12px;
}
.subsection-title { 
  color: #1f2937; 
  font-weight: 600;
}
.resume-document h1, 
.resume-document h2, 
.resume-document h3, 
.resume-document h4 { 
  color: #1f2937; 
  font-weight: 600;
}

/* —— 正文：优化可读性 —— */
.resume-document p, 
.resume-document li { 
  color: #374151; 
  line-height: 1.7;
}
.resume-document .item-duration { 
  color: #9ca3af; /* 柔和浅灰，不刺眼 */
}
.paragraph { 
  color: #374151; 
}
.link { 
  color: #165DFF; /* 蓝色链接，贴合主题 */
  text-decoration: none;
}

/* —— 列表项头部（公司/学校/角色等信息） —— */
.item-header {
  color: #4b5563;
}
.item-title {
  color: #1f2937;
  font-weight: 600;
}
.item-description li {
  color: #374151;
}

/* —— 技能标签：浅蓝质感，正式不浮夸 —— */
.skill-item {
  background-color: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 4px; /* 精致圆角 */
  color: #165DFF;
  padding: 2px 8px;
  font-size: 12px;
}

/* —— 引用块：蓝色侧边栏 —— */
.blockquote {
  border-left: 3px solid #165DFF;
  background-color: #f9fafb;
  color: #4b5563;
  padding: 8px 12px;
  margin: 10px 0;
}

/* —— 分隔线 —— */
.divider { 
  border-top: 1px solid #e5e7eb; 
}

/* —— 三线表：商务正式样式 —— */
.table { 
  border-top-color: #1f2937; 
  border-bottom-color: #1f2937; 
  width: 100%;
  border-collapse: collapse;
}
.table thead th { 
  border-bottom-color: #4b5563; 
  color: #1f2937;
  font-weight: 600;
}
.table tbody td { 
  color: #374151; 
}

/* —— 代码块 —— */
.code-block { 
  background-color: #f9fafb; 
  border-color: #e5e7eb;
  border-radius: 4px;
  padding: 8px 12px;
}
.code-block .code { 
  color: #1f2937; 
}
.inline-code { 
  background-color: #eff6ff; 
  color: #165DFF; 
  border-color: #dbeafe;
  border-radius: 3px;
  padding: 1px 4px;
}

/* —— 可编辑状态：统一蓝色交互 —— */
.resume-document [contenteditable="true"]:hover { 
  background-color: #eff6ff; 
}
.resume-document [contenteditable="true"]:focus { 
  background-color: #dbeafe; 
  outline: none;
}

/* 打印适配：导出PDF无样式错乱 */
@media print {
  .resume-document {
    print-color-adjust: exact;
    -webkit-print-color-adjust: exact;
  }
}
`;

export const THEME_CREATIVE_CSS = `/* theme-creative — 暗色创意 */
.resume-document {
  color: #e6edf3;
  background: #161b22;
}

/* —— 标题 —— */
.resume-name { color: #e6edf3; }
.section-title { border-bottom: none; color: #e6edf3; }
.subsection-title { color: #e6edf3; }
.resume-document h1, .resume-document h2, .resume-document h3, .resume-document h4 { color: #e6edf3; }

/* —— 正文 —— */
.resume-document p, .resume-document li { color: #e6edf3; }
.resume-document .item-duration { color: #6e7681; }
.paragraph { color: #e6edf3; }
.link { color: #58a6ff; }

/* —— 列表项头部 —— */
.item-header { color: #8b949e; }
.item-title { color: #e6edf3; }
.item-description li { color: #e6edf3; }

/* —— 技能标签 —— */
.skill-item {
  background-color: #21262d;
  border: 1px solid #30363d;
  border-radius: 3px;
  color: #8b949e;
}

/* —— 引用块 —— */
.blockquote {
  border-left-color: #30363d;
  background-color: #21262d;
  color: #8b949e;
}

/* —— 分隔线 —— */
.divider { border-top: 1px solid #30363d; }

/* —— 三线表（暗底必须改边框色，否则 #333 不可见） —— */
.table { border-top-color: #30363d; border-bottom-color: #30363d; }
.table thead th { border-bottom-color: #30363d; color: #e6edf3; }
.table tbody td { color: #e6edf3; }

/* —— 代码块 —— */
.code-block { background-color: #21262d; border-color: #30363d; }
.code-block .code { color: #e6edf3; }
.inline-code { background-color: #21262d; color: #e6edf3; border-color: #30363d; }

/* —— 可编辑状态 —— */
.resume-document [contenteditable="true"]:hover { background-color: #21262d; }
.resume-document [contenteditable="true"]:focus { background-color: rgba(56, 139, 253, 0.15); }
`;

export const THEME_MINIMAL_CSS = `/* theme-minimal — 极简灰 */
.resume-document {
  color: #1a1a1a;
  background: #ffffff;
}

/* —— 标题 —— */
.resume-name { color: #1a1a1a; }
.section-title { border-bottom: none; color: #1a1a1a; }
.subsection-title { color: #1a1a1a; }
.resume-document h1, .resume-document h2, .resume-document h3, .resume-document h4 { color: #1a1a1a; }

/* —— 正文 —— */
.resume-document p, .resume-document li { color: #1a1a1a; }
.resume-document .item-duration { color: #888888; }
.paragraph { color: #1a1a1a; }
.link { color: #1a1a1a; }

/* —— 列表项头部 —— */
.item-header { color: #555555; }
.item-title { color: #1a1a1a; }
.item-description li { color: #1a1a1a; }

/* —— 技能标签 — 无边框无线条 —— */
.skill-item {
  background-color: #f0f0f0;
  border: none;
  border-radius: 0;
  color: #555555;
}

/* —— 引用块 —— */
.blockquote {
  border-left-color: #e0e0e0;
  background-color: transparent;
  color: #555555;
}

/* —— 分隔线 —— */
.divider { border-top: 1px solid #e0e0e0; }

/* —— 三线表 —— */
.table { border-top-color: #333333; border-bottom-color: #333333; }
.table thead th { border-bottom-color: #666666; color: #333333; }
.table tbody td { color: #333333; }

/* —— 代码块 —— */
.code-block { background-color: #f8f8f8; border-color: #e0e0e0; }
.code-block .code { color: #1a1a1a; }
.inline-code { background-color: #f8f8f8; color: #1a1a1a; border-color: #e0e0e0; }

/* —— 可编辑状态 —— */
.resume-document [contenteditable="true"]:hover { background-color: #f8f8f8; }
.resume-document [contenteditable="true"]:focus { background-color: #f0f0f0; }
`;

export const THEME_CLASSIC_CSS = `/* theme-classic — 经典黑白（衬线字体） */
.resume-document {
  color: #000000;
  background: #ffffff;
}

/* —— 标题（Georgia 衬线） —— */
.resume-name {
  color: #000000;
  font-family: 'Georgia', 'SimHei', '黑体', serif;
}
.section-title {
  border-bottom: 1px solid #000000;
  color: #000000;
  font-family: 'Georgia', 'SimHei', '黑体', serif;
}
.subsection-title {
  color: #000000;
  font-family: 'Georgia', 'SimHei', '黑体', serif;
}
.resume-document h1, .resume-document h2, .resume-document h3, .resume-document h4 {
  color: #000000;
  font-family: 'Georgia', 'SimHei', '黑体', serif;
}

/* —— 正文（Georgia 衬线） —— */
.resume-document p, .resume-document li {
  color: #000000;
  font-family: 'Georgia', 'SimSun', '宋体', serif;
}
.resume-document .item-duration {
  color: #666666;
  font-family: 'Georgia', 'Times New Roman', serif;
}
.paragraph { color: #000000; font-family: 'Georgia', 'SimSun', '宋体', serif; }
.link { color: #000000; }

/* —— 列表项头部 —— */
.item-header { color: #333333; }
.item-title {
  color: #000000;
  font-family: 'Georgia', 'SimHei', '黑体', serif;
}
.item-description li { color: #000000; }

/* —— 技能标签 —— */
.skill-item {
  background-color: #f0f0f0;
  border: 1px solid #000000;
  border-radius: 2px;
  color: #333333;
}

/* —— 引用块 —— */
.blockquote {
  border-left-color: #000000;
  background-color: #f9f9f9;
  color: #333333;
}

/* —— 分隔线（双线） —— */
.divider { border-top: 1px double #000000; }

/* —— 三线表（加粗表线） —— */
.table { border-top: 2px solid #000000; border-bottom: 2px solid #000000; }
.table thead th { border-bottom: 1px solid #000000; color: #000000; }
.table tbody td { color: #000000; }

/* —— 代码块 —— */
.code-block { background-color: #f9f9f9; border-color: #cccccc; }
.code-block .code { color: #000000; }
.inline-code { background-color: #f9f9f9; color: #000000; border-color: #cccccc; }

/* —— 可编辑状态 —— */
.resume-document [contenteditable="true"]:hover { background-color: #f5f5f5; }
.resume-document [contenteditable="true"]:focus { background-color: #eeeeee; }
`;

export const THEME_MODERN_CSS = `/* theme-modern — 现代紫 */
.resume-document {
  color: #1f1f1f;
  background: #ffffff;
}

/* —— 标题（无衬线 Inter 字体栈） —— */
.resume-document h1, .resume-document h2, .resume-document h3, .resume-document h4 {
  font-family: 'Inter', 'SF Pro Display', 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
}
.resume-name {
  color: #1f1f1f;
  font-family: 'Inter', 'SF Pro Display', 'SimHei', '黑体', 'Microsoft YaHei', sans-serif;
}
.section-title { border-bottom: 2px solid #7c3aed; color: #1f1f1f; }
.section-title--work { border-bottom-color: #7c3aed; }
.section-title--projects { border-bottom-color: #a78bfa; }
.section-title--education { border-bottom-color: #c4b5fd; }
.subsection-title { color: #1f1f1f; }

/* —— 正文 —— */
.resume-document p, .resume-document li { color: #1f1f1f; }
.resume-document .item-duration { color: #9ca3af; }
.paragraph { color: #1f1f1f; }
.link { color: #7c3aed; }

/* —— 列表项头部 —— */
.item-header { color: #6b7280; }
.item-title {
  color: #1f1f1f;
  font-family: 'Inter', 'SF Pro Display', 'SimHei', '黑体', sans-serif;
}
.item-description li { color: #1f1f1f; }

/* —— 技能标签（药丸形） —— */
.skill-item {
  background-color: #f5f3ff;
  border: 1px solid #ede9fe;
  border-radius: 20px;
  color: #6b7280;
}

/* —— 引用块 —— */
.blockquote {
  border-left-color: #8b5cf6;
  background-color: #f5f3ff;
  color: #6b7280;
}

/* —— 分隔线 —— */
.divider { border-top: 1px solid #ede9fe; }

/* —— 三线表 —— */
.table { border-top-color: #333333; border-bottom-color: #333333; }
.table thead th { border-bottom-color: #6b7280; color: #333333; }
.table tbody td { color: #333333; }

/* —— 代码块 —— */
.code-block { background-color: #f5f3ff; border-color: #ede9fe; }
.code-block .code { color: #1f1f1f; }
.inline-code { background-color: #f5f3ff; color: #1f1f1f; border-color: #ede9fe; }

/* —— 可编辑状态 —— */
.resume-document [contenteditable="true"]:hover { background-color: #f5f3ff; }
.resume-document [contenteditable="true"]:focus { background-color: #ede7f6; }
`;

export const THEME_CSS_MAP: Record<string, string> = {
  classic: THEME_BLUE_CSS,
  modern: THEME_MODERN_CSS,
  minimal: THEME_MINIMAL_CSS,
  professional: THEME_CLASSIC_CSS,
  creative: THEME_CREATIVE_CSS,
};
