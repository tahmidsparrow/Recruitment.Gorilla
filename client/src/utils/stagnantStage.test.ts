import { describe, expect, it } from 'vitest';
import {
  calculateAverageStageAge,
  calculateDaysInStage,
  formatStageAge,
  isStageStagnant,
} from './stagnantStage';

describe('stagnantStage utility', () => {
  it('calculates days in stage accurately', () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString();
    expect(calculateDaysInStage(threeDaysAgo)).toBe(3);
    expect(calculateDaysInStage(undefined)).toBe(0);
    expect(calculateDaysInStage('invalid-date')).toBe(0);
  });

  it('detects stagnant stage for non-terminal statuses when >= 5 days', () => {
    const sixDaysAgo = new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString();
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    expect(isStageStagnant(sixDaysAgo, 'Interview Scheduled')).toBe(true);
    expect(isStageStagnant(twoDaysAgo, 'Interview Scheduled')).toBe(false);
  });

  it('never marks terminal statuses as stagnant', () => {
    const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();

    expect(isStageStagnant(tenDaysAgo, 'Hired')).toBe(false);
    expect(isStageStagnant(tenDaysAgo, 'Reject')).toBe(false);
    expect(isStageStagnant(tenDaysAgo, 'Discontinued')).toBe(false);
    expect(isStageStagnant(tenDaysAgo, 'Offer Declined')).toBe(false);
  });

  it('formats stage age cleanly', () => {
    expect(formatStageAge(0)).toBe('< 1d');
    expect(formatStageAge(1)).toBe('1d');
    expect(formatStageAge(5)).toBe('5d');
  });

  it('calculates average stage age for multiple candidates', () => {
    const oneDayAgo = new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString();
    const fiveDaysAgo = new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString();

    expect(calculateAverageStageAge([oneDayAgo, fiveDaysAgo])).toBe(3);
    expect(calculateAverageStageAge([])).toBe(0);
  });
});
