import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import CandidateForm from './CandidateForm';
import type { CVDraft, RoleAppliedOption } from '../types';

vi.mock('../services/api', () => ({
  getInitialStatusOptions: vi.fn(),
  getActiveRoleOptions: vi.fn(),
  getActiveSkillOptions: vi.fn(),
  createCandidate: vi.fn(),
}));
import {
  getInitialStatusOptions,
  getActiveRoleOptions,
  getActiveSkillOptions,
  createCandidate,
} from '../services/api';

const draft: CVDraft = {
  fullName: null, email: null, phone: null, currentTitle: null, skills: null, summary: null,
  linkedInUrl: null, githubUrl: null,
  originalFileName: 'cv.pdf', storedFileName: 'x.pdf', fileType: 'PDF', fileSizeBytes: 1000,
};

const role = (over: Partial<RoleAppliedOption> = {}): RoleAppliedOption => ({
  id: 5, name: 'Backend Engineer', sortOrder: 1, isActive: true,
  location: null, department: null, priority: null,
  createdAt: '2026-01-01T00:00:00Z', endDate: '2027-12-31T00:00:00Z', title: 'Backend Engineer',
  recruiters: [], ...over,
});

describe('CandidateForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInitialStatusOptions).mockResolvedValue([]);
    vi.mocked(getActiveSkillOptions).mockResolvedValue([]);
    vi.mocked(getActiveRoleOptions).mockResolvedValue([]);
  });

  it('shows validation errors and does not submit when required fields are empty', async () => {
    const user = userEvent.setup();
    renderWithProviders(<CandidateForm draft={draft} onSaved={() => {}} onCancel={() => {}} />);

    await user.click(screen.getByRole('button', { name: /Save candidate/i }));

    expect(await screen.findByText('Full name is required.')).toBeInTheDocument();
    expect(screen.getByText('A valid email address is required.')).toBeInTheDocument();
    expect(screen.getByText('Relevant experience is required.')).toBeInTheDocument();
    expect(screen.getByText('Role applied for is required.')).toBeInTheDocument();
    expect(createCandidate).not.toHaveBeenCalled();
  });

  it('auto-selects the role when the recruiter has exactly one assigned', async () => {
    vi.mocked(getActiveRoleOptions).mockResolvedValue([role()]);
    renderWithProviders(<CandidateForm draft={draft} onSaved={() => {}} onCancel={() => {}} />);

    const roleInput = screen.getByPlaceholderText(/Search roles/i);
    await waitFor(() => expect(roleInput).toHaveValue('Backend Engineer'));
  });

  it('does not auto-select when several roles are assigned', async () => {
    vi.mocked(getActiveRoleOptions).mockResolvedValue([role(), role({ id: 6, name: 'Frontend Engineer' })]);
    renderWithProviders(<CandidateForm draft={draft} onSaved={() => {}} onCancel={() => {}} />);

    // Give the query + effect a chance to run, then confirm the role field stayed empty.
    await screen.findByRole('button', { name: /Save candidate/i });
    expect(screen.getByPlaceholderText(/Search roles/i)).toHaveValue('');
  });
});
