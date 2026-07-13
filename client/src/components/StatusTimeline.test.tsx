import { describe, it, expect } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../test/renderWithProviders';
import StatusTimeline from './StatusTimeline';
import type { EvaluationSummary, StatusHistoryEntry } from '../types';

const entry = (over: Partial<StatusHistoryEntry> = {}): StatusHistoryEntry => ({
  id: 1,
  status: 'Uploaded',
  comment: null,
  taskDetails: null,
  submissionUrl: null,
  interviewAt: null,
  changedAt: '2026-07-13T10:00:00Z',
  changedBy: 'Tester',
  interviewId: null,
  interviewers: [],
  interviewTags: [],
  evaluationSummaries: [],
  ...over,
});

const summary = (over: Partial<EvaluationSummary> = {}): EvaluationSummary => ({
  interviewerName: 'Jane Doe',
  overallRating: 5,
  recommendation: 'Recommended',
  recommendationOther: null,
  submittedAt: '2026-07-12T10:00:00Z',
  ...over,
});

describe('StatusTimeline', () => {
  it('renders nothing-yet message for empty history', () => {
    renderWithProviders(<StatusTimeline history={[]} />);
    expect(screen.getByText(/No status history yet/i)).toBeInTheDocument();
  });

  it('strips the legacy "Interview evaluations" text block from a comment', () => {
    renderWithProviders(
      <StatusTimeline
        history={[entry({
          status: 'Interview Completed',
          comment: 'Final decision made.\n\n— Interview evaluations —\n• Jane Doe — Overall 5/5 · Recommended',
        })]}
      />,
    );
    expect(screen.getByText('Final decision made.')).toBeInTheDocument();
    // The baked-in summary text must not leak through.
    expect(screen.queryByText(/Overall 5\/5/)).not.toBeInTheDocument();
    expect(screen.queryByText(/— Interview evaluations —/)).not.toBeInTheDocument();
  });

  it('renders structured evaluation summary cards', () => {
    renderWithProviders(
      <StatusTimeline
        history={[entry({
          status: 'Interview Completed',
          interviewId: 7,
          evaluationSummaries: [summary({ interviewerName: 'Jane Doe', overallRating: 4, recommendation: 'Hold' })],
        })]}
      />,
    );
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
    expect(screen.getByText('Hold')).toBeInTheDocument();
    expect(screen.getByText('4/5')).toBeInTheDocument();
  });

  it('shows the "View full evaluations" link only when canViewEvaluations is set', () => {
    const history = [entry({ status: 'Interview Completed', interviewId: 7 })];

    const { unmount } = renderWithProviders(
      <StatusTimeline history={history} canViewEvaluations={false} />,
    );
    expect(screen.queryByRole('link', { name: /View full evaluations/i })).not.toBeInTheDocument();
    unmount();

    renderWithProviders(<StatusTimeline history={history} canViewEvaluations={true} />);
    const link = screen.getByRole('link', { name: /View full evaluations/i });
    expect(link).toHaveAttribute('href', '/interviews/7');
  });

  it('renders interviewer pills that link to the interview, and interview-type tags', () => {
    renderWithProviders(
      <StatusTimeline
        history={[entry({
          status: 'Interview Scheduled',
          interviewId: 9,
          interviewers: [{ userId: 2, name: 'Sam Interviewer' }],
          interviewTags: ['Technical', '1st Level'],
        })]}
      />,
    );
    expect(screen.getByText('Sam Interviewer')).toBeInTheDocument();
    expect(screen.getByText('Technical')).toBeInTheDocument();
    expect(screen.getByText('1st Level')).toBeInTheDocument();
    // The interviewer pill links to the interview.
    const links = screen.getAllByRole('link');
    expect(links.some((a) => a.getAttribute('href') === '/interviews/9')).toBe(true);
  });
});
