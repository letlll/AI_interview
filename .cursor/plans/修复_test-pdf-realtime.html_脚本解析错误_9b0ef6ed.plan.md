---
name: 修复 test-pdf-realtime.html 脚本解析错误
overview: 将使用 HTML 模板字符串的函数移到外部 JS 文件，避免浏览器 HTML 解析器将模板中的 </body></html> 当作真实结束标签截断脚本。
todos:
  - id: create-functions-js
    content: 创建外部 JS 文件 Test/functions.js，包含所有函数定义
    status: completed
  - id: fix-template-string
    content: 在 renderDomPreview 中将 </body></html> 用 + 拼接分开
    status: completed
  - id: simplify-html
    content: 简化 test-pdf-realtime.html，只保留外部脚本引用和初始化代码
    status: completed
  - id: verify-fix
    content: 验证页面无语法错误且按钮可点击
    status: completed
isProject: false
---

## 问题根因

即使将脚本块拆分为"函数定义"和"初始化"两部分，浏览器 HTML 解析器仍然会在解析 HTML 文档时，**不管字符串上下文**，将模板字符串中的 `</body>` 和 `</html>` 识别为真实的 HTML 结束标签，导致脚本在第 449 行被截断，后续所有函数定义丢失。

- `renderDomPreview` 的模板字符串包含完整的 `</style></head><body>...</body></html>`
- HTML 解析器从 `<script>` 块开始解析 JS，到第 449 行看到 `</body>` 就认为脚本结束了
- `updateAll`、`doElectronPreview` 等函数全部未被解析 → **ReferenceError: updateAll is not defined**

## 修复方案

将所有包含 HTML 结束标签的函数提取到外部 JS 文件 `functions.js` 中。HTML 解析器不会递归解析外部 `.js` 文件的内容，因此不受 `</body></html>` 影响。

## 具体改动

### 改动 1：创建 `Test/functions.js`

新建外部 JS 文件，包含所有函数定义：

```js
// functions.js - 所有函数定义（放在外部文件避免 HTML 解析器截断模板字符串中的 </body></html>）
// 注意：此文件不能包含 </script> 或 </body></html> 在字符串常量之外

let lastHtml = '';
let currentHtml = '';
let lastApiResult = null;
let electronBusy = false;

let domDebounceTimer = null;
let apiDebounceTimer = null;

const API_BASE = 'http://localhost:9999';

const A4_WIDTH_CSS = Math.round(210 / 25.4 * 96);   // 794px
const A4_HEIGHT_CSS = Math.round(297 / 25.4 * 96);   // 1123px
const PT_TO_PX = 96 / 72;                            // 1.333

let editor;

function loadSample() { ... }
function loadSample3Pages() { ... }
function clearPreview() { ... }
function updateAll() { ... }

// renderDomPreview 模板字符串使用 + 拼接避免包含 </body></html> 作为连续字符
function renderDomPreview(html, changeType) { ... }

// stripHtmlOuter - 使用 RegExp 构造函数避免字面量中的 </ 字符串
function stripHtmlOuter(html) { ... }

async function doElectronPreview(html) { ... }
function renderElectronPreview(result, elapsedMs, resumeName) { ... }
function doPrecisePreview() { ... }
function doTextEdit() { ... }
function doStructureChange() { ... }
function switchTab(tab) { ... }
function updateDiffUI(type, reason, stats) { ... }
function updateRenderIndicator(mode, changeType) { ... }
function setStatus(msg, cls) { ... }
function escapeHtml(str) { ... }
```

**关键**：在 `renderDomPreview` 的模板字符串中，使用字符串拼接（`+`）将 `</body>` 和 `</html>` 分开，例如：

```js
'</' + 'body>\n</' + 'html>'
```

这样 HTML 解析器不会在字符串中看到完整的 `</body>` 或 `</html>` 序列。

### 改动 2：简化 `test-pdf-realtime.html`

HTML 结构调整为：

```html
<body>
  <script src="functions.js"></script>    <!-- 第一步：加载所有函数和数据 -->
  <script src="sample.js"></script>
  <script src="sample-3pages.js"></script>
  <script src="change-detector.js"></script>

  <!-- DOM 结构 -->

  <script>
    // 初始化脚本
    editor = document.getElementById('html-editor');
    editor.addEventListener('input', updateAll);
    loadSample();
    // 按钮事件绑定...
  </script>
</body>
```

所有函数和数据（`window.SAMPLE_HTML` 等）都在外部 `.js` 文件中，HTML 解析器只会看到 `<script src="..."></script>`，不会解析 JS 文件内容。