/**
 * change-detector.js
 * 变更类型检测工具：区分"文本编辑"和"结构变更"，用于差异化渲染策略
 *
 * 引用方式：在 HTML 中 <script src="change-detector.js">
 * 导出为 window.ChangeDetector = { detectChangeType, computeDiffStats }
 */

/**
 * 检测 HTML 变更的类型
 * @param {string} oldHtml - 上一次的 HTML
 * @param {string} newHtml - 当前的 HTML
 * @returns {{ type: 'none'|'text'|'structure', reason: string }}
 */
function detectChangeType(oldHtml, newHtml) {
  if (!oldHtml || oldHtml === newHtml) {
    return { type: 'none', reason: '内容无变化' };
  }

  const structurePatterns = [
    // 结构性 class 变化
    {
      pattern: /class="(resume-document|section|table-wrapper|skills-list|item-header|markdown-body|item-title|item-sub|contact|summary|skill-item)/,
      desc: '简历结构性 class 变化',
    },
    // 字体/行高/字间距样式变化
    {
      pattern: /font-size|font-family|line-height|letter-spacing|font-weight/,
      desc: '字体或行高样式变化',
    },
    // 尺寸、margin、padding 变化
    {
      pattern: /(margin|padding|width|height|max-width):\s*\d+/,
      desc: '尺寸或边距变化',
    },
    // 主题切换
    {
      pattern: /theme-(blue|dark|minimal|classic|modern|purple|green|red)/,
      desc: '主题切换',
    },
    // 边框、背景色变化
    {
      pattern: /border|background(-color)?|color:\s*#[0-9a-fA-F]/,
      desc: '边框/背景/颜色变化',
    },
    // 标题数量变化（整块内容增删）
    {
      pattern: /<h[1-6][^>]*>/,
      desc: '标题数量变化',
    },
    // 列表项数量变化
    {
      pattern: /<li[^>]*>/,
      desc: '列表项数量变化',
    },
    // 表格变化
    {
      pattern: /<table|<tr|<td|<th/,
      desc: '表格结构变化',
    },
  ];

  for (const { pattern, desc } of structurePatterns) {
    const oldMatches = (oldHtml.match(pattern) || []).length;
    const newMatches = (newHtml.match(pattern) || []).length;
    if (newMatches !== oldMatches) {
      return { type: 'structure', reason: desc };
    }
  }

  // 长度变化超过 200 字符 → 很可能是新增/删除了整个区块
  const lengthDiff = Math.abs(newHtml.length - oldHtml.length);
  if (lengthDiff > 200) {
    return {
      type: 'structure',
      reason: `长度变化 ${lengthDiff} 字符（>200），可能是新增/删除段落`,
    };
  }

  // 纯文本变化
  return { type: 'text', reason: '纯文本内容编辑' };
}

/**
 * 计算两个 HTML 之间的差异统计
 * @param {string} oldHtml
 * @param {string} newHtml
 * @returns {{ added: number, removed: number, unchanged: number, changePercent: number }}
 */
function computeDiffStats(oldHtml, newHtml) {
  // 提取所有中英文单词/数字，作为粗略的字数统计
  const oldWords = oldHtml.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];
  const newWords = newHtml.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || [];

  const oldSet = new Set(oldWords);
  const newSet = new Set(newWords);

  let unchanged = 0;
  let added = 0;

  for (const w of newWords) {
    if (oldSet.has(w)) {
      unchanged++;
    } else {
      added++;
    }
  }

  let removed = 0;
  for (const w of oldWords) {
    if (!newSet.has(w)) {
      removed++;
    }
  }

  const total = Math.max(oldWords.length, newWords.length, 1);
  return {
    added,
    removed,
    unchanged,
    total: newWords.length,
    changePercent: Math.round(((added + removed) / total) * 100),
  };
}

/**
 * 防抖函数
 * @param {Function} fn - 要防抖的函数
 * @param {number} delay - 延迟毫秒
 * @returns {{ run: Function, cancel: Function }}
 */
function createDebounce(fn, delay) {
  let timer = null;
  return {
    run(...args) {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        fn(...args);
        timer = null;
      }, delay);
    },
    cancel() {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}

// 导出到全局
window.ChangeDetector = {
  detectChangeType,
  computeDiffStats,
  createDebounce,
};
