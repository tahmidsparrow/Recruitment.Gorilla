import { describe, it, expect } from 'vitest';
import { getStatusTone, getStatusClass } from './statusColors';

describe('statusColors', () => {
  it('maps known statuses to their tone', () => {
    expect(getStatusTone('Reject')).toBe('reject');
    expect(getStatusTone('Not Recommended')).toBe('reject');
    expect(getStatusTone('Discontinued')).toBe('reject');
    expect(getStatusTone('Recommended')).toBe('success');
    expect(getStatusTone('Interview Scheduled')).toBe('interview');
    expect(getStatusTone('Interview Completed')).toBe('interview');
    expect(getStatusTone('Technical Assessment')).toBe('assessment');
    expect(getStatusTone('Uploaded')).toBe('uploaded');
    expect(getStatusTone('Ask for Assesment')).toBe('intake');
  });

  it('falls back to "muted" for unknown statuses', () => {
    expect(getStatusTone('Totally Unknown Status')).toBe('muted');
    expect(getStatusTone('')).toBe('muted');
  });

  it('builds the CSS modifier class from the tone', () => {
    expect(getStatusClass('Reject')).toBe('status--reject');
    expect(getStatusClass('Recommended')).toBe('status--success');
    expect(getStatusClass('Unknown')).toBe('status--muted');
  });
});
