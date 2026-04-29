/**
 * functions.js
 * 所有函数定义和数据
 *
 * 放在外部 .js 文件中，避免浏览器 HTML 解析器将模板字符串中的
 * </body></html> 等 HTML 结束标签误认为是脚本块的真实结束标签。
 *
 * 注意：此文件不能包含 </script> 或 </body></html> 在字符串常量之外
 */

// ============================================================
// 全局状态
// ============================================================
let lastHtml = '';
let currentHtml = '';
let lastApiResult = null;
let electronBusy = false;

let domDebounceTimer = null;
let apiDebounceTimer = null;

const API_BASE = 'http://localhost:9999';

// ============================================================
// A4 尺寸常量（与 Electron main.cjs 和 Obsidian constant.ts 保持一致）
// A4: 210mm × 297mm @ 96dpi
// A4 内容区（不含边距）：210mm * 96/25.4 ≈ 794px × 1123px
// Electron 视口总宽（含 marginLeft+marginRight=50+50）：894px
// Electron 视口总高（含 marginTop+marginBottom=40+40）：1123px
// ============================================================
const A4_WIDTH_CSS   = Math.round(210 / 25.4 * 96);   // 794px 内容区宽
const A4_HEIGHT_CSS  = Math.round(297 / 25.4 * 96);   // 1123px 总高
const A4_WIDTH_PT    = 595.28;   // A4 宽 in PDF pt (210mm / 25.4 * 72)
const A4_HEIGHT_PT   = 841.89;   // A4 高 in PDF pt (297mm / 25.4 * 72)
const PT_TO_PX       = 96 / 72;   // 1.333

let editor;

// ============================================================
// 初始化函数
// ============================================================
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

  const { type, reason } = window.ChangeDetector
    ? window.ChangeDetector.detectChangeType(lastHtml, currentHtml)
    : { type: currentHtml === lastHtml ? 'none' : 'text', reason: '' };

  const stats = window.ChangeDetector
    ? window.ChangeDetector.computeDiffStats(lastHtml, currentHtml)
    : {};

  updateDiffUI(type, reason, stats);

  clearTimeout(domDebounceTimer);
  domDebounceTimer = setTimeout(() => {
    renderDomPreview(currentHtml, type);
  }, 300);

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

  const PAGE_MARGIN_PX = Math.round(20 / 25.4 * 96);

  // 使用字符串拼接将 HTML 结束标签拆开，避免被 HTML 解析器误识别
  const wrappedHtml = '<!DOCTYPE html>\n' +
'<html>\n' +
'<head>\n' +
'<meta charset="UTF-8">\n' +
'<style>\n' +
'@page { size: A4; margin: ' + PAGE_MARGIN_PX + 'px; }\n' +
'* { box-sizing: border-box; }\n' +
'body { width: ' + A4_WIDTH_CSS + 'px; min-height: ' + A4_HEIGHT_CSS + 'px; margin: 0 auto; padding: 0; font-size: 14px; line-height: 1.6; color: #333; background: #fff; overflow: visible; }\n' +
'h1 { text-align: center; color: #1a56db; font-size: 26px; margin: 0 0 6px; }\n' +
'.contact { text-align: center; color: #666; font-size: 13px; margin-bottom: 16px; }\n' +
'h2 { color: #1a56db; border-bottom: 1px solid #bfdbfe; padding-bottom: 4px; margin: 16px 0 8px; font-size: 15px; }\n' +
'ul { padding-left: 18px; margin: 0; }\n' +
'li { margin-bottom: 4px; }\n' +
'.item-header { display: flex; justify-content: space-between; margin-bottom: 2px; }\n' +
'.item-title { font-weight: 600; }\n' +
'.item-date { color: #888; font-size: 12px; }\n' +
'.item-sub { color: #666; font-size: 12px; margin-bottom: 4px; }\n' +
'.section { margin-bottom: 14px; }\n' +
'.skills-list { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 6px; }\n' +
'.skill-item { background: #eff6ff; color: #1e40af; padding: 2px 8px; border-radius: 3px; font-size: 12px; }\n' +
'.summary { color: #444; font-size: 13px; margin-bottom: 16px; }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
stripHtmlOuter(html) + '\n' +
'</' + 'body>\n' +
'</' + 'html>';

  const start = performance.now();
  iframe.srcdoc = wrappedHtml;

  iframe.onload = () => {
    const elapsed = Math.round(performance.now() - start);
    let frameInfo = '';
    try {
      const doc = iframe.contentDocument || iframe.contentWindow.document;
      const bodyH = doc.body ? doc.body.scrollHeight : 0;
      frameInfo = ' · 渲染高度 ' + bodyH + 'px · 用时 ' + elapsed + 'ms';
    } catch (e) {
      frameInfo = ' · 用时 ' + elapsed + 'ms';
    }
    meta.textContent = 'DOM 渲染 · A4 ' + A4_WIDTH_CSS + 'x' + A4_HEIGHT_CSS + 'px @ 96dpi · 视口总宽 894px ·' + frameInfo;
  };

  updateRenderIndicator('text', changeType);
  setStatus('DOM 预览已更新（' + (changeType === 'text' ? '文本变更' : '结构调整') + '）', 'success');
}

// ============================================================
// stripHtmlOuter：去除 HTML 外层标签
// 注意：使用字符串拼接避免在正则字面量中出现 </ 序列
// ============================================================
function stripHtmlOuter(html) {
  return html
    .replace(/<!DOCTYPE[^>]*>/i, '')
    .replace(/<html[^>]*>/i, '')
    .replace('</' + 'html>', '')
    .replace(/<head[^>]*>[\s\S]*?<\/head>/i, '')
    .replace('<b' + 'ody', '')
    .replace(new RegExp('</' + 'b' + 'ody>', 'i'), '');
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
  try {
    const res = await fetch(API_BASE + '/api/preview', {
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
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'HTTP ' + res.status);

    lastApiResult = result;
    renderElectronPreview(result, elapsed, resumeName);
    setStatus('Electron 精确预览生成成功 · ' + result.pageCount + ' 页 · ' + elapsed + 'ms', 'success');

  } catch (err) {
    setStatus('Electron API 失败: ' + err.message, 'error');
    document.getElementById('electron-preview-meta').textContent = '错误: ' + err.message;
  } finally {
    if (btn) btn.disabled = false;
    electronBusy = false;
    document.getElementById('timing-info').textContent = '';
  }
}

// ============================================================
// 渲染 Electron 预览
// ============================================================
function renderElectronPreview(result, elapsedMs, resumeName) {
  const pagesDiv = document.getElementById('electron-preview-pages');
  const metaDiv = document.getElementById('electron-preview-meta');
  const dlArea = document.getElementById('electron-download-area');

  pagesDiv.innerHTML = '';

  result.pageImages.forEach(function(img, i) {
    const label = document.createElement('div');
    label.className = 'page-label';
    label.innerHTML = '<span class="badge badge-purple">第 ' + (i + 1) + ' / ' + result.pageCount + ' 页</span>';
    pagesDiv.appendChild(label);

    const imgEl = document.createElement('img');
    imgEl.className = 'preview-page-img';
    imgEl.src = img;
    imgEl.alt = 'Page ' + (i + 1);
    imgEl.onload = function() {
      label.innerHTML = '<span class="badge badge-purple">第 ' + (i + 1) + ' / ' + result.pageCount + ' 页</span>\n' +
        '            <span style="font-size:11px;color:#888;">' + imgEl.naturalWidth + '×' + imgEl.naturalHeight + 'px</span>';
    };
    pagesDiv.appendChild(imgEl);
  });

  const breakInfo = (result.pageBreaks || []).map(function(hPt) {
    return hPt + 'pt → ' + Math.round(hPt * PT_TO_PX) + 'px';
  });

  metaDiv.textContent = [
    'API 响应耗时: ' + elapsedMs + 'ms',
    '页数: ' + result.pageCount,
    'pageBreaks[pt]: [' + (result.pageBreaks || []).join(', ') + ']',
    'pageBreaks[px] (96dpi): [' + breakInfo.join(', ') + ']',
    'PDF 大小: ' + (result.pdfBase64 ? Math.round(result.pdfBase64.length / 1024) + ' KB' : 'N/A'),
    '预览图数量: ' + result.pageImages.length,
    'A4 尺寸(96dpi): 纸宽 794px(内容) / 894px(含边距) × 纸高 1123px(总高)',
    'pt→px 换算: 1pt = ' + PT_TO_PX.toFixed(3) + 'px',
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
    a.download = '简历-' + resumeName + '.pdf';
    a.className = 'dl-btn';
    a.textContent = '下载 PDF（带 header/footer）';
    dlArea.appendChild(a);
  }

  switchTab('electron');
}

// ============================================================
// 手动触发精确预览
// ============================================================
function doPrecisePreview() { doElectronPreview(currentHtml); }

// ============================================================
// 快捷操作：文本编辑
// ============================================================
function doTextEdit() {
  const name = prompt('输入新姓名（文本编辑）:', '王五');
  if (name === null) return;
  const newHtml = currentHtml.replace(/(<h1>)[^<]*(<\/h1>)/, '$1' + escapeHtml(name) + '$2');
  if (newHtml === currentHtml) { alert('未找到 <h1> 姓名标签'); return; }
  editor.value = newHtml;
  currentHtml = newHtml;
  updateAll();
}

// ============================================================
// 快捷操作：结构调整
// ============================================================
function doStructureChange() {
  const choice = prompt(
    '结构调整类型：\n' +
    '1 - 切换字体大小\n' +
    '2 - 切换主题色\n' +
    '3 - 增加一个工作经历区块\n' +
    '输入数字：'
  );
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
      newHtml = currentHtml.replace(/#1a56db/g, '#7c3aed')
        .replace(/#bfdbfe/g, '#ede9fe')
        .replace(/#1e40af/g, '#6d28d9')
        .replace(/#eff6ff/g, '#ede9fe');
    } else {
      newHtml = currentHtml.replace(/#7c3aed/g, '#1a56db')
        .replace(/#ede9fe/g, '#bfdbfe')
        .replace(/#6d28d9/g, '#1e40af')
        .replace(/#ede9fe/g, '#eff6ff');
    }
  } else if (choice === '3') {
    const newSection = '<li><div class="item-header"><span class="item-title">技术经理</span><span class="item-date">2023-至今</span></div><div class="item-sub">某创新科技公司</div><ul><li>负责 10+ 人技术团队管理，制定技术路线图</li><li>推进 DevOps 文化建设，CI/CD 覆盖率达 95%</li><li>主导微服务化改造，系统可用性提升至 99.99%</li></ul></li>';
    if (currentHtml.includes('前端工程师')) {
      newHtml = currentHtml.replace(/(<div class="item-header"><span class="item-title">前端工程师<\/span>)/, newSection + '\n      $1');
    }
  }

  if (newHtml === currentHtml) { setStatus('结构调整应用失败或内容不匹配', 'error'); return; }
  editor.value = newHtml;
  currentHtml = newHtml;
  updateAll();
}

// ============================================================
// Tab 切换
// ============================================================
function switchTab(tab) {
  document.querySelectorAll('.preview-tab').forEach(function(t) {
    t.classList.toggle('active', t.textContent.toLowerCase().includes(tab));
  });
  const domWrap = document.getElementById('dom-preview-wrap');
  const elecWrap = document.getElementById('electron-preview-wrap');
  domWrap.classList.toggle('hidden', tab === 'electron');
  elecWrap.classList.toggle('active', tab !== 'dom');
  if (tab === 'dom') domWrap.classList.remove('hidden');
}

// ============================================================
// UI 辅助函数
// ============================================================
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
    statsEl.textContent = stats.changePercent + '%（+' + stats.added + '/-' + stats.removed + '）';
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

function setStatus(msg, cls) {
  const el = document.getElementById('status-msg');
  el.textContent = msg;
  el.className = 'status-msg ' + (cls || '');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
