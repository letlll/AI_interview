---
name: 修复 iframe sandbox 阻止脚本执行
overview: 为 iframe 添加 allow-scripts 权限，允许 srcdoc 中的脚本执行。
todos:
  - id: fix-sandbox
    content: 添加 allow-scripts 到 iframe sandbox 属性
    status: completed
isProject: false
---

## 问题

`renderDomPreview` 通过 `iframe.srcdoc = wrappedHtml` 设置 iframe 内容时，`wrappedHtml` 模板字符串末尾包含内联脚本用于自动分页逻辑。`<iframe sandbox="allow-same-origin">` **默认阻止脚本执行**，导致 console 报错：`Blocked script execution in 'about:srcdoc' because the document's frame is sandboxed and the 'allow-scripts' permission is not set.`

## 修复

在 `Test/test-pdf-realtime.html` 第 273 行，将：

```html
<iframe id="dom-preview-frame" sandbox="allow-same-origin" scrolling="auto"></iframe>
```

改为：

```html
<iframe id="dom-preview-frame" sandbox="allow-same-origin allow-scripts" scrolling="auto"></iframe>
```

`allow-same-origin` 保留以支持同源脚本访问，`allow-scripts` 允许 srcdoc 中的脚本执行。两者同时设置是安全的。