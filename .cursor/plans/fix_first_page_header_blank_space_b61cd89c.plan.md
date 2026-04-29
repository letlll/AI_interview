---
name: ""
overview: ""
todos: []
isProject: false
---

# 修复：首页 Header 空白更高的根因

## 根因

- `@page { margin-top: 40px }` 固定了 header 区域高度
- `.resume-document { padding: 40px }` 的 top padding 叠加在内容区顶部

```
当前效果：
首页：   [header 40px] + [padding 40px] + [内容]  = 80px 空白
后续页： [header 40px] + [内容]                    = 40px 空白
```

## 修复方案

在 `injectPageCss` 注入的 `@page` 样式中加入 `:first` 伪类，**首页的 margin-top 减少 40px**，去掉 `.resume-document` padding-top 的叠加效果：

```css
@page {
  size: A4;
  margin: 40px 50px 40px 50px;
}
@page :first {
  margin-top: 0;  /* 补偿 .resume-document padding-top: 40px */
}
```

## 文件

`[electron/main.cjs](ai-interview-frontend/electron/main.cjs)` 第 81-101 行 `injectPageCss` 函数