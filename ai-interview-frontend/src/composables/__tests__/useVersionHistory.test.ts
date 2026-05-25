import { describe, it, expect, beforeEach } from 'vitest';
import { useVersionHistory } from '@/composables/useVersionHistory';
import type { ResumeData } from '@/composables/useResumeAI';

describe('useVersionHistory', () => {
  const createResume = (name: string): ResumeData => ({
    content: `# ${name}\n\n## 工作经历\n- 工程师`,
  });

  let history: ReturnType<typeof useVersionHistory>;

  beforeEach(() => {
    history = useVersionHistory(10);
  });

  it('has no versions initially', () => {
    expect(history.hasVersions.value).toBe(false);
    expect(history.versionCount.value).toBe(0);
  });

  it('addVersion creates first snapshot as full', () => {
    history.addVersion(createResume('张三'), '初始版本');
    expect(history.versionCount.value).toBe(1);
    expect(history.versions.value[0].type).toBe('full');
    expect(history.versions.value[0].fullData).toBeDefined();
  });

  it('addVersion creates incremental snapshots after first', () => {
    history.addVersion(createResume('v1'), 'first');
    history.addVersion(createResume('v2'), 'second');
    expect(history.versionCount.value).toBe(2);
    // second version should be incremental (2 % 3 != 0)
    expect(history.versions.value[1].type).toBe('incremental');
  });

  it('every 3rd version is a full snapshot', () => {
    for (let i = 1; i <= 6; i++) {
      history.addVersion(createResume(`v${i}`), `version ${i}`);
    }
    // Positions 0, 3 are full (0-indexed: 0=1st, 3=4th)
    expect(history.versions.value[0].type).toBe('full');
    expect(history.versions.value[3].type).toBe('full');
    expect(history.versions.value[1].type).toBe('incremental');
    expect(history.versions.value[2].type).toBe('incremental');
  });

  it('stores change description', () => {
    history.addVersion(createResume('v1'), '添加技能Docker');
    expect(history.versions.value[0].changeDescription).toBe('添加技能Docker');
  });

  it('getVersionDigest returns formatted summary', () => {
    history.addVersion(createResume('v1'), '初始版本');
    history.addVersion(createResume('v2'), '修改工作经历');

    const digest = history.getVersionDigest(2);
    expect(digest).toContain('初始版本');
    expect(digest).toContain('修改工作经历');
  });

  it('getVersionDigest returns placeholder for empty history', () => {
    expect(history.getVersionDigest(3)).toBe('暂无版本历史');
  });

  it('clearHistory removes all versions', () => {
    history.addVersion(createResume('v1'), 'first');
    history.addVersion(createResume('v2'), 'second');
    history.clearHistory();
    expect(history.versionCount.value).toBe(0);
  });

  it('enforces maxVersions limit', () => {
    const smallHistory = useVersionHistory(3);
    for (let i = 1; i <= 5; i++) {
      smallHistory.addVersion(createResume(`v${i}`), `version ${i}`);
    }
    // Only keeps last 3
    expect(smallHistory.versionCount.value).toBe(3);
  });

  it('latestVersion returns the most recent', () => {
    history.addVersion(createResume('v1'), 'first');
    history.addVersion(createResume('v2'), 'second');
    expect(history.latestVersion.value!.changeDescription).toBe('second');
  });

  it('stores affectedPaths from instructions', () => {
    history.addVersion(
      createResume('v1'),
      '修改了技能',
      [
        { action: 'update', path: 'content', value: 'new' },
        { action: 'add', path: 'customStyles', value: 'css' },
      ],
    );
    expect(history.versions.value[0].affectedPaths).toEqual(['content', 'customStyles']);
  });
});
