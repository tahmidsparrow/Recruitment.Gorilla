import { describe, expect, it } from 'vitest';
import { CLOSING_SOON_MS, jobStatus } from './jobStatus';

const NOW = new Date('2026-08-12T12:00:00Z').getTime();
const at = (offsetMs: number) => new Date(NOW + offsetMs).toISOString();

describe('jobStatus', () => {
  it('reports an opening well before its deadline as open', () => {
    expect(jobStatus({ isActive: true, endDate: at(30 * 24 * 3600_000) }, NOW)).toBe('open');
  });

  it('reports an opening past its deadline as closed', () => {
    expect(jobStatus({ isActive: true, endDate: at(-1000) }, NOW)).toBe('closed');
  });

  it('flags an opening inside the closing-soon window', () => {
    expect(jobStatus({ isActive: true, endDate: at(3 * 24 * 3600_000) }, NOW)).toBe('closing-soon');
  });

  it('treats deactivation as beating the deadline, in both directions', () => {
    // The old UI could show "Active" and "Closed" at once because these were
    // rendered independently. Whichever way they disagree, inactive wins.
    expect(jobStatus({ isActive: false, endDate: at(30 * 24 * 3600_000) }, NOW)).toBe('inactive');
    expect(jobStatus({ isActive: false, endDate: at(-1000) }, NOW)).toBe('inactive');
  });

  it('is open when no deadline was ever set', () => {
    expect(jobStatus({ isActive: true, endDate: null }, NOW)).toBe('open');
    expect(jobStatus({ isActive: true }, NOW)).toBe('open');
  });

  it('does not invent a deadline from an unparseable date', () => {
    expect(jobStatus({ isActive: true, endDate: 'not-a-date' }, NOW)).toBe('open');
  });

  describe('the closing-soon boundary', () => {
    it('includes exactly 7 days out', () => {
      expect(jobStatus({ isActive: true, endDate: at(CLOSING_SOON_MS) }, NOW)).toBe('closing-soon');
    });

    it('excludes a moment beyond 7 days', () => {
      expect(jobStatus({ isActive: true, endDate: at(CLOSING_SOON_MS + 1) }, NOW)).toBe('open');
    });

    it('becomes closed the moment the deadline passes, not before', () => {
      expect(jobStatus({ isActive: true, endDate: at(0) }, NOW)).toBe('closing-soon');
      expect(jobStatus({ isActive: true, endDate: at(-1) }, NOW)).toBe('closed');
    });
  });
});
