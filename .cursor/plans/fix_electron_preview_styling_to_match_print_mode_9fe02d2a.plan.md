---
name: ""
overview: ""
todos: []
isProject: false
---

# Fix Electron Preview: Theme Colors + Duplicate Styles + textFallback Error

## 问题总结

当前 `markdownToHtml`（lines 1686–1825）已可编译运行，但存在三个问题：


| #   | 问题                              | 表现                                                                                                                                 | 根因                                                                                                             |
| --- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 1   | `this.parser.textFallback` 编译错误 | TypeScript 报错 `Property 'textFallback' does not exist`                                                                             | marked v12 中 `textFallback` 是 static 属性，不能用 `this.parser.textFallback` 调用                                      |
| 2   | 主题颜色不生效                         | 切换主题后 Electron 预览颜色不变                                                                                                              | `resumeMarkdownRaw` 末尾有硬编码色值（`color: #333` 等），与 `getThemeVars` 输出的 CSS 变量特异性相同，但 `resumeMarkdownRaw` 后加载，覆盖了变量 |
| 3   | margin/shadow 叠加                | `resumeMarkdownRaw` 的 `max-width: 800px; padding: 40px` 与 `extraStyles` 的 `max-width: 1200px; padding: 52px; box-shadow` 并存，两套样式叠加 | 没有屏蔽 `resumeMarkdownRaw` 中的冲突属性                                                                                |


## 修改文件

**[ai-interview-frontend/src/views/ResumeGeneratorNew.vue](ai-interview-frontend/src/views/ResumeGeneratorNew.vue)**

### Step 1: 修复 `textFallback`（line 1738）

将：

```typescript
if (token.tokens?.length) alt = this.parser.parseInline(token.tokens, this.parser.textFallback);
```

改为：

```typescript
if (token.tokens?.length) alt = this.parser.parseInline(token.tokens);
```

marked v12 的 `parseInline` 不需要第二个参数，去掉即可消除编译错误。

### Step 2: CSS 加载顺序重排，主题变量覆盖硬编码色值

将 HTML 组装部分（lines 1804–1817）从：

```typescript
return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
/* resume-markdown.css 内联（来自 ?raw import） */
${resumeMarkdownRaw}

/* 主题 CSS 变量 */
${getThemeVars(themeClass)}

/* 用户 extraStyles（放在 CSS 变量之后，让自定义属性覆盖生效） */
${extraStyles}
</style>
</head>
...
```

改为：

```typescript
return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
/* 全局 reset：屏蔽 resumeMarkdownRaw 中会与 extraStyles 冲突的属性 */
.resume-document {
  max-width: unset !important;
  min-height: unset !important;
  box-shadow: none !important;
  border-radius: unset !important;
  margin: 0 !important;
}

/* 1. resume-markdown.css（提供完整样式结构，但会被后续覆盖） */
${resumeMarkdownRaw}

/* 2. 主题 CSS 变量（覆盖 resumeMarkdownRaw 末尾的硬编码色值） */
${getThemeVars(themeClass)}

/* 3. extraStyles（用户自定义，放在最后最高优先级） */
${extraStyles}
</style>
</head>
...
```

**作用：** `!important` reset 确保 `resumeMarkdownRaw` 里的 `max-width: 800px`、`box-shadow` 等不与 `extraStyles` 冲突；主题 CSS 变量放在 `resumeMarkdownRaw` 之后，确保覆盖末尾的硬编码色值。

### Step 3: 更新计划文件（清理过时的 Step 0/1/2/3）

将 `getThemeVars` 的 JSDoc 注释改为简洁的单行（删除重复的旧注释块，lines 1660–1672 区域）：

当前文件中有两个连续的 JSDoc 注释（lines 1660–1672 和 1674–1685），删除第一个旧注释块，只保留一个：

```typescript
/**
 * Markdown → HTML 转换（用于 Electron API 调用）
 * ...
 */
```

## 关键设计点


| 问题                                          | 解决方案                                                                                        |
| ------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `this.parser.textFallback` 不存在              | 去掉第二个参数，只用 `parseInline(token.tokens)`                                                      |
| 主题颜色被硬编码色值覆盖                                | 主题 CSS 变量块移到 `resumeMarkdownRaw` 之后加载                                                       |
| `resumeMarkdownRaw` 的布局属性与 `extraStyles` 冲突 | 用 `!important` reset 屏蔽冲突属性（`max-width`、`min-height`、`box-shadow`、`border-radius`、`margin`） |
| 两个重复的 JSDoc 注释块                             | 删除第一个旧注释（lines 1660–1672）                                                                   |


## 预期效果

- TypeScript 编译错误消失
- 切换主题后 Electron 预览正确应用主题色（深色/极简/经典/现代）
- 不会有双倍 margin / 重复阴影 / 冲突的 max-width

