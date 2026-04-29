---
name: 修复 stripHtmlOuter 中的 </script> 被 HTML 解析器截断
overview: 修复 test-pdf-realtime.html 第 637 行 stripHtmlOuter 函数的 replace 链中存在字面字符串 `</script>`，被浏览器 HTML 解析器错误解析为行内 script 块的闭合标签，导致后续全部 JS 被截断成纯文本，按钮事件绑定不生效。
todos: []
isProject: false
---

## 根因分析

行内 `<script>` 块从第 456 行开始，**但 HTML 解析器在第 637 行遇到了 JS 字符串字面量中的 `</script>**`，直接关闭了 script 块。导致：

- 第 456-636 行：正常 JS（执行了）
- 第 637-964 行：被浏览器当纯文本渲染
- 第 965 行 `</script>`：浏览器看到 `</script>` 但没有匹配的打开标签
- 第 956-964 行的按钮事件绑定 `addEventListener` 调用：从未被执行

## 修复方案

将 `stripHtmlOuter` 函数中所有 `.replace()` 链里的 `</script>` 字符串，改为 `<\/script>` 或 `<`+`/script>` 的拼接写法，使 HTML 解析器无法将其误判为 script 闭合标签。

具体改动在 `Test/test-pdf-realtime.html` 第 637 行：

```js
// 改前（错误）
.replace(/<!DOCTYPE[^>]*>/i, '')
.replace(/<html[^>]*>/i, '')
.replace(/<\/html>/i, '')
.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
.replace(/<body/i, '')
.replace(/<\/body>/i, '');

// 改后（正确）
.replace(/<!DOCTYPE[^>]*>/i, '')
.replace(/<html[^>]*>/i, '')
.replace(/<\/html>/i, '')
.replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
.replace(/<body/i, '')
.replace(new RegExp('<\\/body>', 'i'), '');
```

最后一行的 `<\/script>` 用 `new RegExp()` 构造即可逃过 HTML 解析器。