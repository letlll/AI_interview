import { describe, it, expect } from 'vitest';
import {
  detectIntent,
  digestResume,
  applyInstructions,
  cleanInvalidKeys,
  compressHistory,
} from '@/composables/useResumeAI';
import type { Message, UserIntent, ResumeData, UpdateInstruction } from '@/composables/useResumeAI';

// ============================================================
// detectIntent
// ============================================================
describe('detectIntent', () => {
  it('detects "生成" as create intent', () => {
    const result = detectIntent('请帮我生成一份简历');
    expect(result.type).toBe('create');
    expect(result.confidence).toBe(0.8);
  });

  it('detects "修改" as modify intent', () => {
    const result = detectIntent('修改工作经历部分');
    expect(result.type).toBe('modify');
  });

  it('detects "优化" as optimize intent', () => {
    const result = detectIntent('优化简历的表达方式');
    expect(result.type).toBe('optimize');
  });

  it('detects "添加" as add intent', () => {
    const result = detectIntent('添加一项技能：Docker');
    expect(result.type).toBe('add');
  });

  it('detects "删除" as delete intent', () => {
    const result = detectIntent('删除第三条项目经验');
    expect(result.type).toBe('delete');
  });

  it('detects "怎么" as query intent', () => {
    const result = detectIntent('怎么在简历中突出项目亮点？');
    expect(result.type).toBe('query');
  });

  it('defaults to query when no patterns match', () => {
    const result = detectIntent('你好');
    expect(result.type).toBe('query');
    expect(result.confidence).toBe(0.5);
  });

  it('extracts target from message keywords', () => {
    const result = detectIntent('修改工作经历的第2条');
    expect(result.target).toBe('workExperience.1');
  });

  it('extracts skills target', () => {
    const result = detectIntent('添加技能：Kubernetes');
    expect(result.target).toBe('skills');
  });

  it('extracts education target', () => {
    const result = detectIntent('更新教育背景信息');
    expect(result.target).toBe('education');
  });

  it('extracts project target', () => {
    const result = detectIntent('优化项目经验描述');
    expect(result.target).toBe('projects');
  });

  it('falls back to lastEditedField when no target in message', () => {
    const result = detectIntent('修改一下', 'skills');
    expect(result.target).toBe('skills');
  });
});

// ============================================================
// digestResume
// ============================================================
describe('digestResume', () => {
  const resumeContent = `# 李明

## 基本信息
- 岗位：全栈开发工程师

## 我的工作经历
- 公司A 2020-2024 后端开发

## 主要项目经验
- 电商平台 2021-2022
- 数据看板 2023-2024

## 教育背景
- 北京大学 本科 软件工程 2016-2020

## 技能
- Python, Vue, Docker, MySQL`;

  it('extracts name from # heading', () => {
    const result = digestResume({ content: resumeContent });
    expect(result.profile.name).toBe('李明');
  });

  it('returns "未填写" when no name found', () => {
    const result = digestResume({ content: '没有标题的内容' });
    expect(result.profile.name).toBe('未填写');
  });

  it('extracts position from 岗位 field', () => {
    const result = digestResume({ content: resumeContent });
    expect(result.profile.position).toBe('全栈开发工程师');
  });

  it('counts work sections', () => {
    const result = digestResume({ content: resumeContent });
    expect(result.stats.workCount).toBeGreaterThanOrEqual(1);
  });

  it('extracts keywords', () => {
    const result = digestResume({ content: resumeContent });
    expect(result.keywords.length).toBeGreaterThan(0);
    expect(Array.isArray(result.keywords)).toBe(true);
  });

  it('handles empty content gracefully', () => {
    const result = digestResume({ content: '' });
    expect(result.profile.name).toBe('未填写');
    expect(result.profile.position).toBe('未指定');
    expect(result.keywords).toEqual([]);
  });

  it('includes focusArea when focusPath provided', () => {
    const result = digestResume({ content: resumeContent }, 'skills');
    expect(result.focusArea).toBeDefined();
    expect(result.focusArea!.path).toBe('skills');
  });

  it('handles null input gracefully', () => {
    const result = digestResume({});
    expect(result.profile.name).toBe('未填写');
  });
});

// ============================================================
// applyInstructions
// ============================================================
describe('applyInstructions', () => {
  it('add instruction appends to content', () => {
    const data: ResumeData = { content: '# 简历' };
    const instructions: UpdateInstruction[] = [
      { action: 'add', path: 'content', value: '\n## 技能\n- Python' },
    ];
    const result = applyInstructions(data, instructions);
    expect(result.content).toContain('# 简历');
    expect(result.content).toContain('## 技能');
    expect(result.content).toContain('- Python');
  });

  it('update instruction replaces content', () => {
    const data: ResumeData = { content: '# 旧简历' };
    const instructions: UpdateInstruction[] = [
      { action: 'update', path: 'content', value: '# 新简历' },
    ];
    const result = applyInstructions(data, instructions);
    expect(result.content).toBe('# 新简历');
  });

  it('replace instruction works like update', () => {
    const data: ResumeData = { content: '# 旧简历' };
    const instructions: UpdateInstruction[] = [
      { action: 'replace', path: 'content', value: '# 替换后' },
    ];
    const result = applyInstructions(data, instructions);
    expect(result.content).toBe('# 替换后');
  });

  it('delete instruction removes content', () => {
    const data: ResumeData = { content: '# 待删除' };
    const instructions: UpdateInstruction[] = [
      { action: 'delete', path: 'content' },
    ];
    const result = applyInstructions(data, instructions);
    expect(result.content).toBeUndefined();
  });

  it('does not mutate original data', () => {
    const data: ResumeData = { content: '# 原始' };
    const instructions: UpdateInstruction[] = [
      { action: 'update', path: 'content', value: '# 修改后' },
    ];
    const result = applyInstructions(data, instructions);
    expect(data.content).toBe('# 原始');
    expect(result.content).toBe('# 修改后');
  });

  it('handles empty instruction array', () => {
    const data: ResumeData = { content: '# 不变' };
    const result = applyInstructions(data, []);
    expect(result.content).toBe('# 不变');
  });

  it('handles null resumeData', () => {
    const data = null as unknown as ResumeData;
    const instructions: UpdateInstruction[] = [
      { action: 'add', path: 'content', value: '新内容' },
    ];
    const result = applyInstructions(data, instructions);
    expect(result.content).toContain('新内容');
  });

  it('applies multiple instructions in order', () => {
    const data: ResumeData = { content: '# 简历\n## 工作' };
    const instructions: UpdateInstruction[] = [
      { action: 'add', path: 'content', value: '\n## 项目' },
      { action: 'delete', path: 'content' },
    ];
    const result = applyInstructions(data, instructions);
    // delete happens after add, so content is removed
    expect(result.content).toBeUndefined();
  });
});

// ============================================================
// cleanInvalidKeys
// ============================================================
describe('cleanInvalidKeys', () => {
  it('removes empty string keys from object', () => {
    const input = { '': 'bad', name: 'good' };
    const result = cleanInvalidKeys(input);
    expect('' in result).toBe(false);
    expect(result.name).toBe('good');
  });

  it('recursively cleans nested objects', () => {
    const input = { outer: { '': 'bad', inner: 'ok' } };
    const result = cleanInvalidKeys(input);
    expect('' in result.outer).toBe(false);
    expect(result.outer.inner).toBe('ok');
  });

  it('handles arrays', () => {
    const input = [{ '': 'bad', ok: 1 }, { fine: 2 }];
    const result = cleanInvalidKeys(input);
    expect('' in result[0]).toBe(false);
    expect(result[0].ok).toBe(1);
    expect(result[1].fine).toBe(2);
  });

  it('returns primitives unchanged', () => {
    expect(cleanInvalidKeys('string')).toBe('string');
    expect(cleanInvalidKeys(42)).toBe(42);
    expect(cleanInvalidKeys(null)).toBe(null);
  });
});

// ============================================================
// compressHistory
// ============================================================
describe('compressHistory', () => {
  const createMessage = (role: 'user' | 'assistant', content: string, timestamp: number): Message => ({
    role,
    content,
    timestamp,
  });

  const baseIntent: UserIntent = { type: 'modify', confidence: 0.8 };

  it('returns recentMessages, relevantMessages, and earlySummary', () => {
    const messages: Message[] = [
      createMessage('user', '生成一份简历', 1000),
      createMessage('assistant', '好的', 2000),
      createMessage('user', '修改工作经历', 3000),
      createMessage('assistant', '已修改', 4000),
      createMessage('user', '再改一下技能', 5000),
    ];

    const result = compressHistory(messages, baseIntent);
    expect(result).toHaveProperty('recentMessages');
    expect(result).toHaveProperty('relevantMessages');
    expect(result).toHaveProperty('earlySummary');
  });

  it('returns empty arrays for empty messages', () => {
    const result = compressHistory([], baseIntent);
    expect(result.recentMessages).toHaveLength(0);
    expect(result.relevantMessages).toHaveLength(0);
    expect(result.earlySummary).toBe('');
  });

  it('recentMessages includes last 4 at most', () => {
    const messages = Array.from({ length: 10 }, (_, i) =>
      createMessage('user', `message ${i}`, i * 1000),
    );

    const result = compressHistory(messages, baseIntent);
    expect(result.recentMessages.length).toBeLessThanOrEqual(4);
  });
});
