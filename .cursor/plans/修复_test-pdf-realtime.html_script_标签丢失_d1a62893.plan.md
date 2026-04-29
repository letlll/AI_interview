---
name: 修复 test-pdf-realtime.html script 标签丢失
overview: 修复 test-pdf-realtime.html 第 451 行 `<div id="status-bar">` 后面缺少 `<script>` 标签导致全部行内 JS 被当作纯文本渲染的语法错误。
todos: []
isProject: false
---

## 修复方案

在 `Test/test-pdf-realtime.html` 第 451 行的 `<div id="status-bar">` 闭合标签 `</div>` 之后添加缺失的 `<script>` 开始标签。

具体改动：

将第 450-452 行：

```html
  <!-- 底部状态栏 -->
  <div id="status-bar">
    // ============================================================
```

改为：

```html
  <!-- 底部状态栏 -->
  <div id="status-bar">
    <span class="status-msg" id="status-msg">就绪。左侧编辑 HTML，右上角自动检测变更类型并选择渲染路径。</span>
    <span id="char-count">字符数: 0</span>
  </div>

  <script>
    // ============================================================
    // 全局状态
    // ============================================================
```

即：

1. 恢复 `<div id="status-bar">` 内的两个 `<span>` 子元素
2. 补上缺失的 `</div>` 闭合标签
3. 添加 `<script>` 标签开启行内 JS 块

