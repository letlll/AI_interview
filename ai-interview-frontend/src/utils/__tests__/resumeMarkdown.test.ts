import { describe, it, expect } from 'vitest';
import { jsonToResumeMarkdown } from '@/utils/resumeMarkdown';
import type { ResumeData } from '@/utils/resumeMarkdown';

describe('jsonToResumeMarkdown', () => {
  it('returns content from ResumeData', () => {
    const data: ResumeData = {
      content: '# 张三\n\n## 工作经历\n- 工程师',
    };
    expect(jsonToResumeMarkdown(data)).toBe('# 张三\n\n## 工作经历\n- 工程师');
  });

  it('returns empty string when content is undefined', () => {
    const data: ResumeData = {};
    expect(jsonToResumeMarkdown(data)).toBe('');
  });

  it('returns empty string for null', () => {
    expect(jsonToResumeMarkdown(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(jsonToResumeMarkdown(undefined)).toBe('');
  });

  it('returns empty string when content is empty string', () => {
    const data: ResumeData = { content: '' };
    expect(jsonToResumeMarkdown(data)).toBe('');
  });
});
