import { describe, it, expect } from 'vitest';
import { useResumeTheme, cssClassReference, allClassNames } from '@/composables/useResumeTheme';

describe('useResumeTheme', () => {
  it('has empty themeStyles and customStyles initially', () => {
    const { themeStyles, customStyles } = useResumeTheme();
    // themeStyles gets default set in setup
    expect(themeStyles.value.length).toBeGreaterThan(0);
    expect(customStyles.value).toBe('');
  });

  it('extraStyles joins themeStyles and customStyles', () => {
    const { themeStyles, customStyles, extraStyles } = useResumeTheme();
    themeStyles.value = '.resume-document { color: red; }';
    customStyles.value = '.section-title { font-size: 20px; }';

    expect(extraStyles.value).toContain('.resume-document { color: red; }');
    expect(extraStyles.value).toContain('.section-title { font-size: 20px; }');
  });

  it('extraStyles is empty string when both are empty', () => {
    const { themeStyles, customStyles, extraStyles } = useResumeTheme();
    themeStyles.value = '';
    customStyles.value = '';

    expect(extraStyles.value).toBe('');
  });

  it('setTheme updates themeStyles from CSS map', () => {
    const { setTheme, themeStyles } = useResumeTheme();
    const previous = themeStyles.value;
    setTheme('classic');
    // classic should map to some CSS
    expect(themeStyles.value.length).toBeGreaterThan(0);
  });

  it('setCustomStyles updates customStyles', () => {
    const { setCustomStyles, customStyles } = useResumeTheme();
    setCustomStyles('.resume-document { padding: 10px; }');
    expect(customStyles.value).toContain('.resume-document { padding: 10px; }');
  });

  it('extraStyles reacts to setCustomStyles', () => {
    const { setCustomStyles, extraStyles } = useResumeTheme();
    setCustomStyles('/* test */');
    expect(extraStyles.value).toContain('/* test */');
  });
});

// ============================================================
// CSS Class Reference — static data validation
// ============================================================
describe('cssClassReference', () => {
  it('contains expected groups', () => {
    const groups = cssClassReference.map(g => g.group);
    expect(groups).toContain('容器');
    expect(groups).toContain('标题');
    expect(groups).toContain('列表容器');
    expect(groups).toContain('列表项');
  });

  it('each group has non-empty classes array', () => {
    for (const group of cssClassReference) {
      expect(group.classes.length).toBeGreaterThan(0);
    }
  });

  it('each class entry has name, desc, and props', () => {
    for (const group of cssClassReference) {
      for (const entry of group.classes) {
        expect(entry.name).toBeTruthy();
        expect(entry.desc).toBeTruthy();
        expect(entry.props).toBeTruthy();
      }
    }
  });

  it('allClassNames is flat list matching cssClassReference', () => {
    const expected = cssClassReference.flatMap(g => g.classes.map(c => c.name));
    expect(allClassNames).toEqual(expected);
  });
});
