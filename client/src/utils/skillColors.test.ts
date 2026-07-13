import { describe, it, expect } from 'vitest';
import { SKILL_COLOR_COUNT, skillColorIndex, skillColorClass } from './skillColors';

describe('skillColors', () => {
  const names = ['C#', '.NET', 'React', 'TypeScript', 'SQL', 'Python', 'AWS', 'Docker', 'Kubernetes', 'Go'];

  it('always maps a name to an index within the palette range', () => {
    for (const name of names) {
      const i = skillColorIndex(name);
      expect(i).toBeGreaterThanOrEqual(0);
      expect(i).toBeLessThan(SKILL_COLOR_COUNT);
      expect(Number.isInteger(i)).toBe(true);
    }
  });

  it('is stable — the same name always yields the same index/class', () => {
    for (const name of names) {
      expect(skillColorIndex(name)).toBe(skillColorIndex(name));
      expect(skillColorClass(name)).toBe(skillColorClass(name));
    }
  });

  it('produces the expected class shape', () => {
    for (const name of names) {
      expect(skillColorClass(name)).toBe(`skill-badge skill-badge--${skillColorIndex(name)}`);
    }
  });

  it('handles empty string without throwing', () => {
    const i = skillColorIndex('');
    expect(i).toBeGreaterThanOrEqual(0);
    expect(i).toBeLessThan(SKILL_COLOR_COUNT);
  });
});
