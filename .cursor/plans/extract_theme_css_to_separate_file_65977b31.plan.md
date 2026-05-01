---
name: Extract theme CSS to separate file
overview: 将 `ResumeGeneratorNew.vue` 中约 150 行的 `getThemeCss` 函数抽取为独立文件 `src/utils/resumeThemeCss.ts`，并在原位置改为 import 引用，同时清理重复的全局 reset CSS。
todos:
  - id: extract-theme-css
    content: 新建 src/utils/resumeThemeCss.ts 包含 getThemeCss 函数
    status: pending
  - id: update-resume-generator
    content: ResumeGeneratorNew.vue 添加 import，删除原函数体
    status: pending
  - id: simplify-reset-styles
    content: 简化 markdownToHtml reset 样式，删除与 getThemeCss 重复的颜色定义
    status: pending
isProject: false
---

## 概述

将 `ResumeGeneratorNew.vue` 第 1664–1815 行的 `getThemeCss` 函数抽取为独立工具文件 `src/utils/resumeThemeCss.ts`，在原文件中改为 `import { getThemeCss } from '@/utils/resumeThemeCss'` 引用。

同时对 `markdownToHtml` 生成的 HTML 文档中的全局 reset 样式做简化（去掉与 `getThemeCss` 重复的属性），确保主题 CSS 加载顺序不变。

---

## 具体改动

### 1. 新建 `ai-interview-frontend/src/utils/resumeThemeCss.ts`

复制 `getThemeCss` 函数体（5 个主题的 CSS 字符串），保留完整注释和类型签名：

```typescript
/**
 * 返回所选主题的完整 CSS 块
 * 策略：不用 CSS 变量，直接输出 .theme-xxx 选择器的 color/border 属性
 * 这样避免 CSS 变量级联顺序问题，也确保 Electron print 兼容性
 */
export function getThemeCss(themeClass: string): string {
  const themes: Record<string, string> = {
    'theme-blue': `...`,
    'theme-dark': `...`,
    'theme-minimal': `...`,
    'theme-classic': `...`,
    'theme-modern': `...`,
  };
  return themes[themeClass] || themes['theme-blue'];
}
```

### 2. 修改 `ResumeGeneratorNew.vue`

**2a. 添加 import（建议放在其他 utils import 附近）**

```typescript
import { getThemeCss } from '@/utils/resumeThemeCss';
```

**2b. 删除原 `getThemeCss` 函数定义（第 1664–1815 行）**

删除整个 `function getThemeCss(themeClass: string): string { ... }` 函数体。

**2c. 简化 `markdownToHtml` 中的 reset 样式（第 1973–1990 行）**

当前 reset 块中有很多硬编码的十六进制色值，与 `getThemeCss` 主题中的定义重复。精简为只保留 `background: #ffffff` 和 `!important` 的结构性 reset，把具体颜色全部交给 `getThemeCss`：

```typescript
/* 全局 reset：屏蔽 resumeMarkdownRaw 中的冲突属性 */
body { background: #ffffff; }
.resume-document {
  background: var(--bg, #ffffff);
  color: var(--text-primary, #1f1f1f);
  max-width: unset !important;
  min-height: unset !important;
  box-shadow: none !important;
  border-radius: unset !important;
  margin: 0 !important;
  padding: 0 !important;
}
```

删除以下重复内容（这些颜色已由 `getThemeCss` 接管）：

```css
/* 删除这整块 */
.resume-document h3,
.resume-document h4,
.resume-document h5,
.resume-document h6 { color: var(--text-primary, #1f1f1f); }
.resume-document p,
.resume-document li { color: var(--text-secondary, #666666); }
.resume-document .item { border-left-color: var(--accent, #409eff); }
```

**CSS 加载顺序保持不变：**

```
1. reset（简化后）
2. resumeMarkdownRaw
3. getThemeCss(themeClass)
4. extraStyles
```

---

## 文件清单


| 操作  | 文件路径                                                     |
| --- | -------------------------------------------------------- |
| 新建  | `ai-interview-frontend/src/utils/resumeThemeCss.ts`      |
| 修改  | `ai-interview-frontend/src/views/ResumeGeneratorNew.vue` |


