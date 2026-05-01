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
    'theme-creative': `
/* 创意主题 - 浅色活力版（无暗黑） */
.resume-document.theme-creative { 
  color: #1f1f1f; 
  background: #ffffff; 
}
.resume-document.theme-creative h1,
.resume-document.theme-creative h2,
.resume-document.theme-creative h3,
.resume-document.theme-creative h4 { 
  color: #1f1f1f; 
  border-bottom-color: #f97316; 
}
.resume-document.theme-creative h5 { 
  color: #555555; 
}
.resume-document.theme-creative h6,
.resume-document.theme-creative p,
.resume-document.theme-creative li { 
  color: #666666; 
}
.resume-document.theme-creative .item-duration { 
  color: #999999; 
}
/* 统一边框：创意主色 */
.resume-document.theme-creative .work-item,
.resume-document.theme-creative .project-item,
.resume-document.theme-creative .education-item { 
  border-left-color: #f97316; 
}
/* 技能标签：创意柔和风格 */
.resume-document.theme-creative .skill-item { 
  background: #fff7ed; 
  color: #f97316; 
  border-color: #fed7aa; 
}
.resume-document.theme-creative .resume-name { 
  color: #1f1f1f; 
  border-bottom-color: #f97316; 
}
/* 统一所有标题：无斜体/虚线，极简统一 */
.resume-document.theme-creative .section-title,
.resume-document.theme-creative .section-title--work,
.resume-document.theme-creative .section-title--projects,
.resume-document.theme-creative .section-title--project,
.resume-document.theme-creative .section-title--education,
.resume-document.theme-creative .section-title--skills,
.resume-document.theme-creative .section-title--summary { 
  color: #1f1f1f; 
  border-bottom-color: #f97316; 
  font-style: normal; 
  border-bottom-style: solid; 
}
.resume-document.theme-creative .link { 
  color: #f97316; 
}
.resume-document.theme-creative .blockquote { 
  border-left-color: #f97316; 
  background: #fff7ed; 
}
`,
    'theme-minimal': `
.resume-document.theme-minimal { color: #1a1a1a; background: #ffffff; }
.resume-document.theme-minimal h1,
.resume-document.theme-minimal h2,
.resume-document.theme-minimal h3,
.resume-document.theme-minimal h4 { color: #1a1a1a; border-bottom-color: #555555; }
.resume-document.theme-minimal h5 { color: #555555; }
.resume-document.theme-minimal h6,
.resume-document.theme-minimal p,
.resume-document.theme-minimal li { color: #666666; }
.resume-document.theme-minimal .item-duration { color: #999999; }
/* 统一模块边框：中灰柔和线，区别于经典主题的深色线 */
.resume-document.theme-minimal .work-item,
.resume-document.theme-minimal .project-item,
.resume-document.theme-minimal .education-item { border-left-color: #555555; }
/* 极简技能标签：超浅背景，无攻击性 */
.resume-document.theme-minimal .skill-item { background: #f9fafb; color: #555555; border-color: #e5e7eb; }
.resume-document.theme-minimal .resume-name { color: #1a1a1a; border-bottom-color: #555555; }
/* 统一所有标题：删除斜体/虚线，浅灰分割线，极致极简 */
.resume-document.theme-minimal .section-title,
.resume-document.theme-minimal .section-title--work,
.resume-document.theme-minimal .section-title--projects,
.resume-document.theme-minimal .section-title--project,
.resume-document.theme-minimal .section-title--education,
.resume-document.theme-minimal .section-title--skills,
.resume-document.theme-minimal .section-title--summary { 
  color: #1a1a1a; 
  border-bottom-color: #e5e7eb; 
  font-style: normal; 
  border-bottom-style: solid; 
}
.resume-document.theme-minimal .link { color: #555555; }
.resume-document.theme-minimal .blockquote { border-left-color: #555555; background: #f8f8f8; }
`,
    'theme-classic': `
.resume-document.theme-classic { color: #1a1a1a; background: #ffffff; }
.resume-document.theme-classic h1,
.resume-document.theme-classic h2,
.resume-document.theme-classic h3,
.resume-document.theme-classic h4 { color: #1a1a1a; border-bottom-color: #1a1a1a; }
.resume-document.theme-classic h5 { color: #333333; }
.resume-document.theme-classic h6,
.resume-document.theme-classic p,
.resume-document.theme-classic li { color: #333333; }
.resume-document.theme-classic .item-duration { color: #666666; }
.resume-document.theme-classic .work-item,
.resume-document.theme-classic .project-item,
.resume-document.theme-classic .education-item { border-left-color: #1a1a1a; }
.resume-document.theme-classic .skill-item { background: #f5f5f5; color: #1a1a1a; border-color: #d1d5db; }
.resume-document.theme-classic .resume-name { color: #1a1a1a; border-bottom-color: #1a1a1a; }
/* 统一所有标题样式：删除斜体/虚线，全固态边框，视觉极致统一 */
.resume-document.theme-classic .section-title,
.resume-document.theme-classic .section-title--work,
.resume-document.theme-classic .section-title--projects,
.resume-document.theme-classic .section-title--project,
.resume-document.theme-classic .section-title--education,
.resume-document.theme-classic .section-title--skills,
.resume-document.theme-classic .section-title--summary { 
  color: #1a1a1a; 
  border-bottom-color: #1a1a1a; 
  font-style: normal; 
  border-bottom-style: solid; 
}
.resume-document.theme-classic .link { color: #1a1a1a; }
.resume-document.theme-classic .blockquote { border-left-color: #1a1a1a; background: #f9f9f9; }
`,
    'theme-modern': `
.resume-document.theme-modern { 
    color: #1f1f1f; 
    background: #ffffff; 
}
.resume-document.theme-modern h1,
.resume-document.theme-modern h2,
.resume-document.theme-modern h3,
.resume-document.theme-modern h4 { 
    color: #1f1f1f; 
    border-bottom-color: #8b5cf6; 
}
.resume-document.theme-modern h5,
.resume-document.theme-modern h6,
.resume-document.theme-modern p,
.resume-document.theme-modern li { 
    color: #6b7280; 
}
.resume-document.theme-modern .item-duration { 
    color: #9ca3af; 
}
.resume-document.theme-modern .work-item,
.resume-document.theme-modern .project-item,
.resume-document.theme-modern .education-item { 
    border-left-color: #8b5cf6; 
}
.resume-document.theme-modern .skill-item { 
    background: #f5f3ff; 
    color: #8b5cf6; 
    border-color: #ede9fe; 
}
.resume-document.theme-modern .resume-name { 
    color: #1f1f1f; 
    border-bottom-color: #8b5cf6; 
}
/* 全样式统一 */
.resume-document.theme-modern .section-title { 
    color: #1f1f1f; 
    border-bottom: 2px solid #8b5cf6; 
    font-style: normal; 
    border-bottom-style: solid; 
}
.resume-document.theme-modern .link { 
    color: #8b5cf6; 
}
.resume-document.theme-modern .blockquote { 
    border-left-color: #8b5cf6; 
    background: #f5f3ff; 
}
`,
  };
  return themes[themeClass] || themes['theme-blue'];
}