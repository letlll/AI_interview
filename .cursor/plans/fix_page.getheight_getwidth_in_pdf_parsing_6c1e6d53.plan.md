---
name: Fix page.getHeight/getWidth in pdf parsing
overview: Fix parsePdfPageBreaks and /api/parsedebug to use page.getHeight()/getWidth() instead of the non-existent getBounds(). These are the correct pdf-lib convenience methods that return numbers directly.
todos: []
isProject: false
---

## 根因

`page.getBounds()` 不是 pdf-lib ^1.17.1 的有效方法，pdf-lib 的正确 API 是 `page.getHeight()` 和 `page.getWidth()`，直接返回数字（pt）。

## 修改文件

### 1. `ai-interview-frontend/electron/main.cjs`

**修复 `parsePdfPageBreaks` 函数**（约第 199-218 行），将：

```js
const [x1, y1, x2, y2] = page.getBounds();
const heightPt = y2 - y1;
const widthPt = x2 - x1;
```

改为：

```js
const heightPt = page.getHeight();
const widthPt = page.getWidth();
```

**修复 `/api/parsedebug` 端点**（约第 593-614 行），将：

```js
const [x1, y1, x2, y2] = page.getBounds();
```

改为：

```js
const x1 = 0, y1 = 0; // mediabox 原点
const x2 = page.getWidth();
const y2 = page.getHeight();
```

### 2. 验证

重启 Electron 后，`/api/preview` 和 `/api/parsedebug` 都应正常工作，不再报错。