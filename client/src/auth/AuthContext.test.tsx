import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import type { User as OidcUser } from 'oidc-client-ts';
import { AuthProvider, useAuth } from './AuthContext';
import type { Role } from '../types';

// No network: the provider calls userManager.getUser() on mount, oidc-client-ts's
// own session restore. readAtsRoles is mocked too — its own decoding logic is
// covered separately in userManager.test.ts; this file is about role-derivation.
vi.mock('./userManager', () => ({
  userManager: {
    getUser: vi.fn(),
    events: {
      addUserLoaded: vi.fn(() => () => {}),
      addUserUnloaded: vi.fn(() => () => {}),
    },
    signinRedirect: vi.fn(),
    removeUser: vi.fn(),
  },
  readAtsRoles: vi.fn(),
}));
import { userManager, readAtsRoles } from './userManager';

function Flags() {
  const { isSuperAdmin, isAdminOrAbove, canWriteCandidates, isInterviewerOnly, loading } = useAuth();
  return (
    <div>
      <span data-testid="loading">{String(loading)}</span>
      <span data-testid="super">{String(isSuperAdmin)}</span>
      <span data-testid="admin">{String(isAdminOrAbove)}</span>
      <span data-testid="write">{String(canWriteCandidates)}</span>
      <span data-testid="intonly">{String(isInterviewerOnly)}</span>
    </div>
  );
}

async function renderWithRoles(roles: Role[] | null) {
  vi.mocked(userManager.getUser).mockResolvedValue(
    roles === null
      ? null
      : ({
          profile: { name: 'Test', email: 'test@x.io' },
          access_token: 'fake-token',
          expired: false,
        } as unknown as OidcUser),
  );
  vi.mocked(readAtsRoles).mockReturnValue(roles ?? []);
  render(
    <AuthProvider>
      <Flags />
    </AuthProvider>,
  );
  await waitFor(() => expect(screen.getByTestId('loading').textContent).toBe('false'));
}

const flag = (id: string) => screen.getByTestId(id).textContent;

describe('AuthContext role derivation', () => {
  beforeEach(() => vi.clearAllMocks());

  it('SuperAdmin: super + admin-or-above + write, not interviewer-only', async () => {
    await renderWithRoles(['SuperAdmin']);
    expect(flag('super')).toBe('true');
    expect(flag('admin')).toBe('true');
    expect(flag('write')).toBe('true');
    expect(flag('intonly')).toBe('false');
  });

  it('Admin: admin-or-above + write but not super', async () => {
    await renderWithRoles(['Admin']);
    expect(flag('super')).toBe('false');
    expect(flag('admin')).toBe('true');
    expect(flag('write')).toBe('true');
    expect(flag('intonly')).toBe('false');
  });

  it('Recruiter: write only — not admin-or-above, not interviewer-only', async () => {
    await renderWithRoles(['Recruiter']);
    expect(flag('admin')).toBe('false');
    expect(flag('write')).toBe('true');
    expect(flag('intonly')).toBe('false');
  });

  it('Interviewer: no write/admin, is interviewer-only', async () => {
    await renderWithRoles(['Interviewer']);
    expect(flag('admin')).toBe('false');
    expect(flag('write')).toBe('false');
    expect(flag('intonly')).toBe('true');
  });

  it('no session: everything false (interviewer-only requires a user)', async () => {
    await renderWithRoles(null);
    expect(flag('super')).toBe('false');
    expect(flag('admin')).toBe('false');
    expect(flag('write')).toBe('false');
    expect(flag('intonly')).toBe('false');
  });

  it('multiple roles combine (Recruiter + Interviewer → write, not interviewer-only)', async () => {
    await renderWithRoles(['Recruiter', 'Interviewer']);
    expect(flag('write')).toBe('true');
    expect(flag('intonly')).toBe('false');
  });
});
