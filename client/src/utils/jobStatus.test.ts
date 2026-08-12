import { describe, expect, it } from 'vitest';
import { CLOSING_SOON_MS, daysUntil, elapsedPercent, jobStatus } from './jobStatus';

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

describe('daysUntil', () => {
  it('counts whole calendar days ahead', () => {
    expect(daysUntil(at(3 * 24 * 3600_000), NOW)).toBe(3);
  });

  it('goes negative once the date has passed', () => {
    expect(daysUntil(at(-2 * 24 * 3600_000), NOW)).toBe(-2);
  });

  it('counts by calendar day, not by 24-hour block', () => {
    // 09:00 tomorrow is "1 day" whether asked at 08:00 or 23:00 today, which is
    // how a date reads to a person.
    const eightAm = new Date('2026-08-12T08:00:00').getTime();
    const elevenPm = new Date('2026-08-12T23:00:00').getTime();
    const nineAmTomorrow = new Date('2026-08-13T09:00:00').toISOString();
    expect(daysUntil(nineAmTomorrow, eightAm)).toBe(1);
    expect(daysUntil(nineAmTomorrow, elevenPm)).toBe(1);
  });

  it('returns null when there is no usable date', () => {
    expect(daysUntil(null, NOW)).toBeNull();
    expect(daysUntil(undefined, NOW)).toBeNull();
    expect(daysUntil('not-a-date', NOW)).toBeNull();
  });
});

describe('elapsedPercent', () => {
  const created = at(-10 * 24 * 3600_000);

  it('is 50 at the midpoint of the posting window', () => {
    expect(elapsedPercent(created, at(10 * 24 * 3600_000), NOW)).toBe(50);
  });

  it('clamps to 0 and 100 outside the window', () => {
    expect(elapsedPercent(at(10 * 24 * 3600_000), at(20 * 24 * 3600_000), NOW)).toBe(0);
    expect(elapsedPercent(created, at(-1 * 24 * 3600_000), NOW)).toBe(100);
  });

  it('returns null rather than a fabricated 0 when it cannot be computed', () => {
    // §2.7's rule: "unknown" and "none" must not look the same. The caller omits
    // the bar on null instead of drawing an empty one.
    expect(elapsedPercent(null, at(1000), NOW)).toBeNull();
    expect(elapsedPercent(created, null, NOW)).toBeNull();
    expect(elapsedPercent('nope', at(1000), NOW)).toBeNull();
  });

  it('returns null when the deadline is not after the posted date', () => {
    expect(elapsedPercent(created, created, NOW)).toBeNull();
    expect(elapsedPercent(at(0), at(-1000), NOW)).toBeNull();
  });
});
