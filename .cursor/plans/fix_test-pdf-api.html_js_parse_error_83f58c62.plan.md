---
name: Fix test-pdf-api.html JS parse error
overview: Fix the "Unexpected end of input" and "sendRequest is not defined" errors in Test/test-pdf-api.html by escaping the closing script tag inside the template literal.
todos: []
isProject: false
---

## 问题根因

第 130 行拆分 `</body>` 确实必要，但遗漏了第 130 行中隐含的 `</script>` 实际上 HTML 解析器从头扫描，在第 130 行遇到 `</body>` 时继续扫描到 `</html>` 并在其后发现 `</script>` —— 于是把第 230 行的 `</script>` 当成了多余的未闭合标签，脚本被提前截断，`sendRequest` 和 `loadSample` 从未被解析。

## 修复方案

把模板字符串末尾的 `</html>` 后面的部分也用字符串拼接方式拆分，与 `</body>` 保持一致：

**第 130 行**：`<` + `/body>` （保持不变）

**第 131 行后**：在模板字符串结束后追加 `<' + '/script>'` 来阻止 HTML 解析器再次误匹配。

实际上，正确做法是**同时拆分 `</script>` 和 `</body>**`，模板字符串结尾改为：

```
... </div>
<` + `/body>
</html>
<` + `/script>
</body>
</html>
```

文件路径：`Test/test-pdf-api.html`

- 第 130 行：`<' + '/script>'` 加在模板字符串结束后
- 确保 `<` + `/script>` 与模板字符串拼接正确衔接

