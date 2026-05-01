/**
 * 返回所选主题的完整 CSS 块
 * 策略：不用 CSS 变量，直接输出 .theme-xxx 选择器的 color/border 属性
 * 这样避免 CSS 变量级联顺序问题，也确保 Electron print 兼容性
 */
export function getThemeCss(themeClass: string): string {
  const themes: Record<string, string> = {
    'theme-blue': `
/* 优化后：极简蓝色主题简历 */
.resume-document.theme-blue { 
  color: #333333; 
  background: #ffffff; 
}
.resume-document.theme-blue h1,h2,h3,h4 { 
  color: #000000; 
  border-bottom-color: #0056b3; 
}
.resume-document.theme-blue h5,h6,p,li { color: #555555; }
.resume-document.theme-blue .item-duration { color: #999999; }

.resume-document.theme-blue .work-item,
.resume-document.theme-blue .project-item,
.resume-document.theme-blue .education-item { 
  border-left-color: #0056b3; 
}

.resume-document.theme-blue .skill-item { 
  background: #ffffff; 
  color: #0056b3; 
  border: 1px solid #0056b3; 
}

.resume-document.theme-blue .resume-name { 
  color: #000000; 
  border-bottom-color: #0056b3; 
}

/* 全模块样式统一 */
.resume-document.theme-blue .section-title { 
  color: #000000; 
  border-bottom: 2px solid #0056b3; 
  font-style: normal; 
}

.resume-document.theme-blue .link { color: #0056b3; }
.resume-document.theme-blue .blockquote { 
  border-left-color: #0056b3; 
  background: #f9f9f9; 
}
`,
    'theme-dark': `
.resume-document.theme-dark { color: #e6edf3; background: #161b22; }
.resume-document.theme-dark h1,
.resume-document.theme-dark h2,
.resume-document.theme-dark h3,
.resume-document.theme-dark h4 { color: #e6edf3; border-bottom-color: #58a6ff; }
.resume-document.theme-dark h5 { color: #8b949e; }
.resume-document.theme-dark h6 { color: #6e7681; }
.resume-document.theme-dark p,
.resume-document.theme-dark li { color: #8b949e; }
.resume-document.theme-dark .item-duration { color: #6e7681; }
.resume-document.theme-dark .work-item,
.resume-document.theme-dark .project-item,
.resume-document.theme-dark .education-item { border-left-color: #58a6ff; }
.resume-document.theme-dark .skill-item { background: #21262d; color: #e6edf3; border-color: #30363d; }
.resume-document.theme-dark .resume-name { color: #e6edf3; border-bottom-color: #58a6ff; }
.resume-document.theme-dark .section-title { color: #e6edf3; border-bottom-color: #30363d; }
.resume-document.theme-dark .section-title--work { border-bottom-color: #3fb950; }
.resume-document.theme-dark .section-title--projects,
.resume-document.theme-dark .section-title--project { border-bottom-color: #d29922; }
.resume-document.theme-dark .section-title--education { border-bottom-color: #79c0ff; }
.resume-document.theme-dark .section-title--skills { border-bottom-color: #58a6ff; color: #8b949e; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-dark .section-title--summary { border-bottom-color: #58a6ff; color: #8b949e; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-dark .link { color: #58a6ff; }
.resume-document.theme-dark .blockquote { border-left-color: #58a6ff; background: #21262d; }
`,
    'theme-minimal': `
.resume-document.theme-minimal { color: #1a1a1a; background: #ffffff; }
.resume-document.theme-minimal h1,
.resume-document.theme-minimal h2,
.resume-document.theme-minimal h3,
.resume-document.theme-minimal h4 { color: #1a1a1a; border-bottom-color: #333333; }
.resume-document.theme-minimal h5 { color: #555555; }
.resume-document.theme-minimal h6 { color: #888888; }
.resume-document.theme-minimal p,
.resume-document.theme-minimal li { color: #555555; }
.resume-document.theme-minimal .item-duration { color: #888888; }
.resume-document.theme-minimal .work-item,
.resume-document.theme-minimal .project-item,
.resume-document.theme-minimal .education-item { border-left-color: #333333; }
.resume-document.theme-minimal .skill-item { background: #f5f5f5; color: #555555; border-color: #e0e0e0; }
.resume-document.theme-minimal .resume-name { color: #1a1a1a; border-bottom-color: #333333; }
.resume-document.theme-minimal .section-title { color: #1a1a1a; border-bottom-color: #e0e0e0; }
.resume-document.theme-minimal .section-title--work { border-bottom-color: #999999; }
.resume-document.theme-minimal .section-title--projects,
.resume-document.theme-minimal .section-title--project { border-bottom-color: #bbbbbb; }
.resume-document.theme-minimal .section-title--education { border-bottom-color: #aaaaaa; }
.resume-document.theme-minimal .section-title--skills { border-bottom-color: #333333; color: #555555; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-minimal .section-title--summary { border-bottom-color: #333333; color: #555555; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-minimal .link { color: #333333; }
.resume-document.theme-minimal .blockquote { border-left-color: #333333; background: #f8f8f8; }
`,
    'theme-classic': `
.resume-document.theme-classic { color: #000000; background: #ffffff; }
.resume-document.theme-classic h1,
.resume-document.theme-classic h2,
.resume-document.theme-classic h3,
.resume-document.theme-classic h4 { color: #000000; border-bottom-color: #000000; }
.resume-document.theme-classic h5 { color: #333333; }
.resume-document.theme-classic h6 { color: #666666; }
.resume-document.theme-classic p,
.resume-document.theme-classic li { color: #333333; }
.resume-document.theme-classic .item-duration { color: #666666; }
.resume-document.theme-classic .work-item,
.resume-document.theme-classic .project-item,
.resume-document.theme-classic .education-item { border-left-color: #000000; }
.resume-document.theme-classic .skill-item { background: #f0f0f0; color: #333333; border-color: #000000; }
.resume-document.theme-classic .resume-name { color: #000000; border-bottom-color: #000000; }
.resume-document.theme-classic .section-title { color: #000000; border-bottom-color: #000000; }
.resume-document.theme-classic .section-title--work { border-bottom-color: #000000; }
.resume-document.theme-classic .section-title--projects,
.resume-document.theme-classic .section-title--project { border-bottom-color: #333333; }
.resume-document.theme-classic .section-title--education { border-bottom-color: #666666; }
.resume-document.theme-classic .section-title--skills { border-bottom-color: #1a1a1a; color: #333333; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-classic .section-title--summary { border-bottom-color: #1a1a1a; color: #333333; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-classic .link { color: #000000; }
.resume-document.theme-classic .blockquote { border-left-color: #000000; background: #f5f5f5; }
`,
    'theme-modern': `
.resume-document.theme-modern { color: #1f1f1f; background: #ffffff; }
.resume-document.theme-modern h1,
.resume-document.theme-modern h2,
.resume-document.theme-modern h3,
.resume-document.theme-modern h4 { color: #1f1f1f; border-bottom-color: #7c3aed; }
.resume-document.theme-modern h5 { color: #6b7280; }
.resume-document.theme-modern h6 { color: #9ca3af; }
.resume-document.theme-modern p,
.resume-document.theme-modern li { color: #6b7280; }
.resume-document.theme-modern .item-duration { color: #9ca3af; }
.resume-document.theme-modern .work-item,
.resume-document.theme-modern .project-item,
.resume-document.theme-modern .education-item { border-left-color: #7c3aed; }
.resume-document.theme-modern .skill-item { background: #f3e8ff; color: #7c3aed; border-color: #ede9fe; }
.resume-document.theme-modern .resume-name { color: #1f1f1f; border-bottom-color: #7c3aed; }
.resume-document.theme-modern .section-title { color: #1f1f1f; border-bottom-color: #ede9fe; }
.resume-document.theme-modern .section-title--work { border-bottom-color: #7c3aed; }
.resume-document.theme-modern .section-title--projects,
.resume-document.theme-modern .section-title--project { border-bottom-color: #a78bfa; }
.resume-document.theme-modern .section-title--education { border-bottom-color: #c4b5fd; }
.resume-document.theme-modern .section-title--skills { border-bottom-color: #7c3aed; color: #6b7280; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-modern .section-title--summary { border-bottom-color: #7c3aed; color: #6b7280; font-style: italic; border-bottom-style: dotted; }
.resume-document.theme-modern .link { color: #7c3aed; }
.resume-document.theme-modern .blockquote { border-left-color: #7c3aed; background: #f5f3ff; }
`,
  };
  return themes[themeClass] || themes['theme-blue'];
}