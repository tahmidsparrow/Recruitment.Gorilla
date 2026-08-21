import { describe, it, expect } from 'vitest';
import { readAtsRoles } from './userManager';

function fakeAccessToken(claims: Record<string, unknown>): string {
  const payload = btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `header.${payload}.signature`;
}

describe('readAtsRoles', () => {
  it('reads the ats_roles claim from a real-shaped access token', () => {
    const token = fakeAccessToken({ sub: 'abc', ats_roles: ['Recruiter', 'Interviewer'] });
    expect(readAtsRoles(token)).toEqual(['Recruiter', 'Interviewer']);
  });

  it('reads a single role serialized as a bare string, not a one-element array', () => {
    // Confirmed against a real IAM token: a claim with exactly one value serializes
    // as a scalar, not ["Admin"] — only two-or-more-role subjects get an array.
    const token = fakeAccessToken({ sub: 'abc', ats_roles: 'Admin' });
    expect(readAtsRoles(token)).toEqual(['Admin']);
  });

  it('returns an empty array when ats_roles is absent', () => {
    const token = fakeAccessToken({ sub: 'abc' });
    expect(readAtsRoles(token)).toEqual([]);
  });

  it('drops non-string entries rather than throwing', () => {
    const token = fakeAccessToken({ ats_roles: ['Recruiter', 42, null] });
    expect(readAtsRoles(token)).toEqual(['Recruiter']);
  });

  it('returns an empty array for a malformed token instead of throwing', () => {
    expect(readAtsRoles('not-a-jwt')).toEqual([]);
  });
});
