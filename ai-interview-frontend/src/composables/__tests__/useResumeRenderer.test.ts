import { describe, it, expect } from 'vitest';
import { buildPdfHtmlDocument } from '@/composables/useResumeRenderer';

describe('buildPdfHtmlDocument', () => {
  const plainMd = '# 张三\n\n## 工作经历\n\n- 工程师';

  it('返回完整 HTML 文档', () => {
    const html = buildPdfHtmlDocument({ content: plainMd });
    expect(html).toMatch(/^<!DOCTYPE html>/);
    expect(html).toMatch(/<html>/);
    expect(html).toMatch(/<\/html>$/);
    expect(html).toMatch(/<meta charset="UTF-8">/);
  });

  it('注入 RESUME_CSS 基线样式', () => {
    const html = buildPdfHtmlDocument({ content: plainMd });
    expect(html).toMatch(/\.resume-document\s*\{/);
    expect(html).toMatch(/\.resume-name\s*\{/);
    expect(html).toMatch(/\.section-title\s*\{/);
  });

  it('PDF 容器 reset 排在 RESUME_CSS 之后，无 !important', () => {
    const html = buildPdfHtmlDocument({ content: plainMd });
    // reset 在 RESUME_CSS 之后（通过 "基线 CSS" 和 "容器 reset" 注释定位）
    const baselineIdx = html.indexOf('基线 CSS');
    const resetIdx = html.indexOf('容器 reset');
    expect(resetIdx).toBeGreaterThan(baselineIdx);

    const resetSection = html.substring(
      resetIdx,
      html.indexOf('</style>')
    );
    expect(resetSection).toMatch(/box-shadow:\s*none\b/);
    expect(resetSection).toMatch(/max-width:\s*unset\b/);
    expect(resetSection).not.toMatch(/!important/);
  });

  it('themeStyles 为空时不输出主题块', () => {
    const html = buildPdfHtmlDocument({ content: plainMd });
    expect(html).not.toMatch(/切换主题时整套替换/);
  });

  it('customStyles 为空时不输出自定义块', () => {
    const html = buildPdfHtmlDocument({ content: plainMd });
    expect(html).not.toMatch(/切换主题时保留/);
  });

  it('themeStyles 非空时注入带注释的主题块', () => {
    const html = buildPdfHtmlDocument({
      content: plainMd,
      themeStyles: '.resume-document { color: red; }',
    });
    expect(html).toMatch(/切换主题时整套替换/);
    expect(html).toContain('.resume-document { color: red; }');
  });

  it('customStyles 非空时注入带注释的自定义块', () => {
    const html = buildPdfHtmlDocument({
      content: plainMd,
      customStyles: '.section-title { font-size: 20px; }',
    });
    expect(html).toMatch(/切换主题时保留/);
    expect(html).toContain('.section-title { font-size: 20px; }');
  });

  it('CSS 注入顺序：RESUME_CSS → reset → themeStyles → customStyles', () => {
    const html = buildPdfHtmlDocument({
      content: plainMd,
      themeStyles: '/* THEME */',
      customStyles: '/* CUSTOM */',
    });

    const baselineIdx = html.indexOf('基线 CSS');
    const resetIdx = html.indexOf('容器 reset');
    const themeIdx = html.indexOf('/* THEME */');
    const customIdx = html.indexOf('/* CUSTOM */');

    expect(baselineIdx).toBeGreaterThan(0);
    expect(resetIdx).toBeGreaterThan(baselineIdx);
    expect(themeIdx).toBeGreaterThan(resetIdx);
    expect(customIdx).toBeGreaterThan(themeIdx);
  });

  it('Markdown 内容正确渲染并包裹在 .resume-document 中', () => {
    const html = buildPdfHtmlDocument({ content: '# 测试' });
    expect(html).toMatch(/<div class="resume-document">/);
    expect(html).toMatch(/<h1 class="resume-name" contenteditable="true"/);
  });

  it('Markdown 列表被正确渲染', () => {
    const html = buildPdfHtmlDocument({ content: '## 技能\n\n- TypeScript\n- Vue' });
    expect(html).toMatch(/<ul class="item-list">/);
    expect(html).toMatch(/<li class="item">TypeScript<\/li>/);
  });

  it('同时传入 themeStyles 和 customStyles 正常', () => {
    const html = buildPdfHtmlDocument({
      content: plainMd,
      themeStyles: '.resume-document { color: blue; }',
      customStyles: '.section-title { margin: 10px; }',
    });
    expect(html).toContain('.resume-document { color: blue; }');
    expect(html).toContain('.section-title { margin: 10px; }');
  });
});
