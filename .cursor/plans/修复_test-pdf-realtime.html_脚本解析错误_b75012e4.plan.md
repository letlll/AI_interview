---
name: 修复 test-pdf-realtime.html 脚本解析错误
overview: 将 test-pdf-realtime.html 的内联 script 块拆分为两部分，在外部脚本加载前完成函数定义，避免外部 JS 中的 </script> 被浏览器误解析为内联 JS 的结束标签。
todos:
  - id: add-fn-def-block
    content: 在外部脚本加载前插入函数定义脚本块
    status: completed
  - id: replace-init-block
    content: 将原内联脚本块替换为仅包含初始化逻辑
    status: completed
  - id: verify-fix
    content: 验证页面无语法错误且按钮可点击
    status: completed
isProject: false
---

## 问题根因

`sample.js` 和 `sample-3pages.js` 中的模板字符串包含 `</html>` 和 `</body>`，当这些外部脚本被加载时，浏览器 HTML 解析器在看到字符串中的 `</script>` 序列时，会将其误认为是当前内联 `<script>` 块的结束标签，导致后续所有 JS 代码（函数定义、事件绑定）未被解析，变成游离文本节点，最终触发 `SyntaxError: Unexpected end of input`。

## 修复方案

将第 456-965 行的内联 `<script>` 块拆分为两部分：

### 第一步：在第 456 行之前（外部脚本加载之前）插入函数定义块

将第 456-943 行的函数定义代码包裹在 `<script>` 标签内，放置在外部脚本加载之前。

### 第二步：在外部脚本加载之后保留初始化块

在 `</script>` (line 456) 之前（外部脚本 `<script>` 标签之后，即第 373 行后），将第 944-965 行的初始化代码包裹在 `<script>` 标签内。

## 具体改动

### 改动 1：在外部脚本加载之前插入函数定义块

在第 370 行 `<script src="sample.js">` 之前添加：

```html
  <script>
    // ============================================================
    // 全局状态
    // ============================================================
    let lastHtml = '';
    let currentHtml = '';
    let lastApiResult = null;
    let electronBusy = false;

    // 防抖定时器
    let domDebounceTimer = null;
    let apiDebounceTimer = null;

    const API_BASE = 'http://localhost:9999';

    // ============================================================
    // DOM 尺寸常量（与 Obsidian constant.ts 保持一致）
    // A4: 210mm × 297mm @ 96dpi
    // ============================================================
    const A4_WIDTH_CSS = Math.round(210 / 25.4 * 96);   // 794px
    const A4_HEIGHT_CSS = Math.round(297 / 25.4 * 96);   // 1123px
    const PT_TO_PX = 96 / 72;                            // 1.333

    // ============================================================
    // 初始化
    // ============================================================
    const editor = document.getElementById('html-editor');

    function loadSample() {
      editor.value = window.SAMPLE_HTML || '';
      lastHtml = '';
      currentHtml = editor.value;
      updateAll();
    }

    function loadSample3Pages() {
      editor.value = window.SAMPLE_HTML_3PAGES || '';
      lastHtml = '';
      currentHtml = editor.value;
      updateAll();
    }

    function clearPreview() {
      document.getElementById('dom-preview-frame').srcdoc = '';
      document.getElementById('electron-preview-pages').innerHTML = '';
      document.getElementById('electron-preview-meta').textContent = 'Electron 渲染 · 已清除';
      document.getElementById('electron-download-area').innerHTML = '';
      lastApiResult = null;
      setStatus('已清除预览', '');
    }

    // ============================================================
    // 核心：每次编辑器内容变化触发的完整流程
    // ============================================================
    function updateAll() {
      currentHtml = editor.value;
      document.getElementById('char-count').textContent = '字符数: ' + currentHtml.length;

      // 1. 变更类型检测
      const { type, reason } = window.ChangeDetector
        ? window.ChangeDetector.detectChangeType(lastHtml, currentHtml)
        : { type: currentHtml === lastHtml ? 'none' : 'text', reason: '' };

      const stats = window.ChangeDetector
        ? window.ChangeDetector.computeDiffStats(lastHtml, currentHtml)
        : {};

      updateDiffUI(type, reason, stats);

      // 2. DOM 实时预览（300ms 防抖）
      clearTimeout(domDebounceTimer);
      domDebounceTimer = setTimeout(() => {
        renderDomPreview(currentHtml, type);
      }, 300);

      // 3. 差异化触发 Electron 精确预览
      if (type === 'structure') {
        clearTimeout(apiDebounceTimer);
        apiDebounceTimer = setTimeout(() => {
          doElectronPreview(currentHtml);
        }, 1500);
      } else if (type === 'text') {
        clearTimeout(apiDebounceTimer);
        apiDebounceTimer = setTimeout(() => {
          doElectronPreview(currentHtml);
        }, 3000);
      }

      lastHtml = currentHtml;
    }

    // ============================================================
    // DOM 实时预览（iframe srcdoc，无 API 调用）
    // ============================================================
    function renderDomPreview(html, changeType) {
      const iframe = document.getElementById('dom-preview-frame');
      const meta = document.getElementById('dom-preview-meta');

      const PAGE_MARGIN_MM = 20;
      const PAGE_MARGIN_PX = Math.round(PAGE_MARGIN_MM / 25.4 * 96);

      const wrappedHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
@page { size: A4; margin: ${PAGE_MARGIN_PX}px; }
* { box-sizing: border-box; }
body { width: ${A4_WIDTH_CSS}px; min-height: ${A4_HEIGHT_CSS}px; margin: 0 auto; padding: 0; font-size: 14px; line-height: 1.6; color: #333; background: #fff; overflow: visible; }
h1 { text-align: center; color: #1a56db; font-size: 26px; margin: 0 0 6px; }
.contact { text-align: center; color: #666; font-size: 13px; margin-bottom: 16px; }
h2 { color: #1a56db; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin: 16px 0 8px; font-size: 15px; }
ul { padding-left: 18px; margin: 0; }
li { margin-bottom: 4px; }
.item-header { display: flex; justify-content: space-between; margin-bottom: 2px; }
.item-title { font-weight: 600; }
.item-date { color: #888; font-size: 12px; }
.item-sub { color: #666; font-size: 12px; margin-bottom: 4px; }
.section { margin-bottom: 14px; }
.skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }
.skill-item { background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
.summary { color: #444; font-size: 13px; margin-bottom: 16px; }
</style>
</head>
<body>
${stripHtmlOuter(html)}
</body>
</html>`;

      const start = performance.now();
      iframe.srcdoc = wrappedHtml;

      iframe.onload = () => {
        const elapsed = Math.round(performance.now() - start);
        let frameInfo = '';
        try {
          const doc = iframe.contentDocument || iframe.contentWindow.document;
          const bodyH = doc.body ? doc.body.scrollHeight : 0;
          frameInfo = ` · 渲染高度 ${bodyH}px · 用时 ${elapsed}ms`;
        } catch (e) {
          frameInfo = ` · 用时 ${elapsed}ms`;
        }
        meta.textContent = `DOM 渲染 · A4 ${A4_WIDTH_CSS}px × ${A4_HEIGHT_CSS}px @ 96dpi${frameInfo}`;
      };

      updateRenderIndicator('text', changeType);
      setStatus(`DOM 预览已更新（${changeType === 'text' ? '文本变更' : '结构调整'}）`, 'success');
    }

    function stripHtmlOuter(html) {
      return html
        .replace(/<!DOCTYPE[^>]*>/i, '')
        .replace(/<html[^>]*>/i, '')
        .replace(/<\/html>/i, '')
        .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
        .replace(/<body/i, '')
        .replace(new RegExp('<\\/body>', 'i'), '');
    }

    // ============================================================
    // Electron 精确预览（调用 API）
    // ============================================================
    async function doElectronPreview(html) {
      if (electronBusy) {
        setStatus('Electron 正在处理上一次请求，请稍候...', 'loading');
        return;
      }
      const btn = document.getElementById('btn-precise');
      if (btn) btn.disabled = true;
      electronBusy = true;
      updateRenderIndicator('electron');

      const resumeName = '测试简历';
      const marginTop = 40, marginBottom = 40, marginLeft = 50, marginRight = 50;

      setStatus('正在调用 Electron API 生成精确预览...', 'loading');

      const start = Date.now();
      let result;
      try {
        const res = await fetch(`${API_BASE}/api/preview`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            html,
            options: {
              resumeName,
              marginTop, marginBottom, marginLeft, marginRight,
              displayHeaderFooter: true,
            },
          }),
        });

        const elapsed = Date.now() - start;
        result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);

        lastApiResult = result;
        renderElectronPreview(result, elapsed, resumeName);
        setStatus(`Electron 精确预览生成成功 · ${result.pageCount} 页 · ${elapsed}ms`, 'success');

      } catch (err) {
        setStatus(`Electron API 失败: ${err.message}`, 'error');
        document.getElementById('electron-preview-meta').textContent = `错误: ${err.message}`;
      } finally {
        if (btn) btn.disabled = false;
        electronBusy = false;
        document.getElementById('timing-info').textContent = '';
      }
    }

    function renderElectronPreview(result, elapsedMs, resumeName) {
      const pagesDiv = document.getElementById('electron-preview-pages');
      const metaDiv = document.getElementById('electron-preview-meta');
      const dlArea = document.getElementById('electron-download-area');

      pagesDiv.innerHTML = '';
      result.pageImages.forEach((img, i) => {
        const label = document.createElement('div');
        label.className = 'page-label';
        label.innerHTML = `<span class="badge badge-purple">第 ${i + 1} / ${result.pageCount} 页</span>`;
        pagesDiv.appendChild(label);

        const imgEl = document.createElement('img');
        imgEl.className = 'preview-page-img';
        imgEl.src = img;
        imgEl.alt = `Page ${i + 1}`;
        imgEl.onload = () => {
          label.innerHTML = `<span class="badge badge-purple">第 ${i + 1} / ${result.pageCount} 页</span>
            <span style="font-size:11px;color:#888;">${imgEl.naturalWidth}×${imgEl.naturalHeight}px</span>`;
        };
        pagesDiv.appendChild(imgEl);
      });

      const breakInfo = (result.pageBreaks || []).map(hPt => `${hPt}pt → ${Math.round(hPt * PT_TO_PX)}px`);
      metaDiv.textContent = [
        `API 响应耗时: ${elapsedMs}ms`,
        `页数: ${result.pageCount}`,
        `pageBreaks[pt]: [${(result.pageBreaks || []).join(', ')}]`,
        `pageBreaks[px] (96dpi): [${breakInfo.join(', ')}]`,
        `PDF 大小: ${result.pdfBase64 ? Math.round(result.pdfBase64.length / 1024) + ' KB' : 'N/A'}`,
        `预览图数量: ${result.pageImages.length}`,
        `A4 尺寸(96dpi): ${A4_WIDTH_CSS}×${A4_HEIGHT_CSS}px`,
        `pt→px 换算: 1pt = ${PT_TO_PX.toFixed(3)}px`,
      ].join('\n');

      dlArea.innerHTML = '';
      if (result.pdfBase64) {
        let bytes;
        try {
          const binary = atob(result.pdfBase64);
          bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        } catch (e) { return; }
        const a = document.createElement('a');
        const blob = new Blob([bytes], { type: 'application/pdf' });
        a.href = URL.createObjectURL(blob);
        a.download = `简历-${resumeName}.pdf`;
        a.className = 'dl-btn';
        a.textContent = '下载 PDF（带 header/footer）';
        dlArea.appendChild(a);
      }

      switchTab('electron');
    }

    function doPrecisePreview() { doElectronPreview(currentHtml); }

    function doTextEdit() {
      const name = prompt('输入新姓名（文本编辑）:', '王五');
      if (name === null) return;
      const newHtml = currentHtml.replace(/(<h1>)[^<]*(<\/h1>)/, `$1${escapeHtml(name)}$2`);
      if (newHtml === currentHtml) { alert('未找到 <h1> 姓名标签'); return; }
      editor.value = newHtml;
      currentHtml = newHtml;
      updateAll();
    }

    function doStructureChange() {
      const choice = prompt('结构调整类型：\n1 - 切换字体大小\n2 - 切换主题色\n3 - 增加一个工作经历区块\n输入数字：');
      if (!choice) return;
      let newHtml = currentHtml;

      if (choice === '1') {
        if (currentHtml.includes('font-size: 14px')) {
          newHtml = currentHtml.replace(/font-size: 14px/g, 'font-size: 16px');
        } else {
          newHtml = currentHtml.replace(/font-size: 16px/g, 'font-size: 14px');
        }
      } else if (choice === '2') {
        if (currentHtml.includes('#1a56db')) {
          newHtml = currentHtml.replace(/#1a56db/g, '#7c3aed').replace(/#bfdbfe/g, '#ede9fe').replace(/#1e40af/g, '#6d28d9').replace(/#eff6ff/g, '#ede9fe');
        } else {
          newHtml = currentHtml.replace(/#7c3aed/g, '#1a56db').replace(/#ede9fe/g, '#bfdbfe').replace(/#6d28d9/g, '#1e40af').replace(/#ede9fe/g, '#eff6ff');
        }
      } else if (choice === '3') {
        const newSection = `<li><div class="item-header"><span class="item-title">技术经理</span><span class="item-date">2023-至今</span></div><div class="item-sub">某创新科技公司</div><ul><li>负责 10+ 人技术团队管理，制定技术路线图</li><li>推进 DevOps 文化建设，CI/CD 覆盖率达 95%</li><li>主导微服务化改造，系统可用性提升至 99.99%</li></ul></li>`;
        const insertBefore = currentHtml.match(/<\/ul>\s*<\/li>\s*<\/div>\s*<div class="section">/);
        if (insertBefore) {
          newHtml = currentHtml.replace(/(<div class="item-header"><span class="item-title">前端工程师<\/span>)/, newSection + '\n      $1');
        }
      }

      if (newHtml === currentHtml) { setStatus('结构调整应用失败或内容不匹配', 'error'); return; }
      editor.value = newHtml;
      currentHtml = newHtml;
      updateAll();
    }

    function switchTab(tab) {
      document.querySelectorAll('.preview-tab').forEach(t => {
        t.classList.toggle('active', t.textContent.toLowerCase().includes(tab));
      });
      const domWrap = document.getElementById('dom-preview-wrap');
      const elecWrap = document.getElementById('electron-preview-wrap');
      domWrap.classList.toggle('hidden', tab === 'electron');
      elecWrap.classList.toggle('active', tab !== 'dom');
      if (tab === 'dom') domWrap.classList.remove('hidden');
    }

    function updateDiffUI(type, reason, stats) {
      const typeBadge = document.getElementById('change-type-badge');
      const typeEl = document.getElementById('diff-type');
      const reasonEl = document.getElementById('diff-reason');
      const statsEl = document.getElementById('diff-stats');
      const pathEl = document.getElementById('diff-path');

      typeBadge.className = 'tag ' + (type === 'structure' ? 'tag-blue' : type === 'text' ? 'tag-green' : 'tag-gray');
      typeBadge.textContent = type === 'none' ? '无变化' : type === 'structure' ? '结构' : '文本';
      typeEl.textContent = type === 'none' ? '—' : type === 'structure' ? '结构变更' : '文本编辑';
      reasonEl.textContent = reason || '—';
      if (stats && stats.total !== undefined) {
        statsEl.textContent = `${stats.changePercent}%（+${stats.added}/-${stats.removed}）`;
      } else {
        statsEl.textContent = '—';
      }
      pathEl.textContent = type === 'none' ? '—' : type === 'structure' ? 'Electron（1.5s 防抖）' : 'DOM 即时 + Electron（3s 防抖）';
    }

    function updateRenderIndicator(mode, changeType) {
      const indicator = document.getElementById('render-indicator');
      const text = document.getElementById('render-mode-text');
      indicator.className = '';
      if (mode === 'electron') {
        indicator.classList.add('electron-mode');
        text.textContent = 'Electron 渲染中...';
      } else if (mode === 'text') {
        indicator.classList.add(changeType === 'structure' ? 'structure-mode' : 'text-mode');
        text.textContent = changeType === 'structure' ? '结构变更 → 待 Electron' : 'DOM 轻量渲染';
      }
    }

    function setStatus(msg, cls = '') {
      const el = document.getElementById('status-msg');
      el.textContent = msg;
      el.className = 'status-msg ' + cls;
    }

    function escapeHtml(str) {
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }
  </script>
```

### 改动 2：修改原内联脚本块为初始化块

将第 456-965 行的原内联脚本块替换为：

```html
  <script>
    // ============================================================
    // 事件绑定（必须放在所有函数定义之后）
    // ============================================================
    editor.addEventListener('input', updateAll);

    // 初始化：加载示例
    loadSample();

    // ============================================================
    // 按钮事件绑定
    // ============================================================
    document.getElementById('btn-text-edit').addEventListener('click', doTextEdit);
    document.getElementById('btn-structure-change').addEventListener('click', doStructureChange);
    document.getElementById('btn-precise').addEventListener('click', doPrecisePreview);
    document.getElementById('btn-load-sample').addEventListener('click', loadSample);
    document.getElementById('btn-load-sample-3p').addEventListener('click', loadSample3Pages);
    document.getElementById('btn-clear').addEventListener('click', clearPreview);
    document.getElementById('tab-dom').addEventListener('click', () => switchTab('dom'));
    document.getElementById('tab-electron').addEventListener('click', () => switchTab('electron'));
    document.getElementById('tab-both').addEventListener('click', () => switchTab('both'));
  </script>
```

## 修复原理

通过将脚本分块：

- 函数定义脚本在外部脚本加载**之前**执行，外部脚本的 `</script>` 不会影响它
- 初始化脚本在外部脚本加载**之后**执行，此时 `window.SAMPLE_HTML` 等已经可用

这样 `</script>` 永远不会出现在两个内联脚本块的字符串内容中。