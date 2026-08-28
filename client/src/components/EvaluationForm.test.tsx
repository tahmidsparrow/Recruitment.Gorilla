import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import EvaluationForm from './EvaluationForm';

vi.mock('../services/api', () => ({
  saveEvaluation: vi.fn(),
  getInterviewEvaluationRubric: vi.fn().mockResolvedValue(null),
}));
import { saveEvaluation, getInterviewEvaluationRubric } from '../services/api';

describe('EvaluationForm submit gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveEvaluation).mockResolvedValue({} as never);
    vi.mocked(getInterviewEvaluationRubric).mockResolvedValue(null as never);
  });

  it('blocks Submit until the rubric is complete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationForm interviewId={1} evaluation={null} />);

    await user.click(screen.getByRole('button', { name: /Submit evaluation/i }));

    // The confirm modal must NOT open, a specific toast appears, and nothing is saved.
    expect(screen.queryByRole('button', { name: /Yes, submit/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/Please rate all/i)).toBeInTheDocument();
    expect(saveEvaluation).not.toHaveBeenCalled();
  });

  it('opens the confirm modal and saves once all 12 ratings + recommendation + overall are set', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationForm interviewId={1} evaluation={null} />);

    // Click rating "4" on all 12 criteria
    const ratingButtons = screen.getAllByTitle('4 — Exceeds Expectations');
    expect(ratingButtons).toHaveLength(12);
    for (const btn of ratingButtons) {
      await user.click(btn);
    }

    await user.selectOptions(screen.getByLabelText(/Final recommendation/i), 'Recommended');
    await user.selectOptions(screen.getByLabelText(/Overall rating/i), '4');

    await user.click(screen.getByRole('button', { name: /Submit evaluation/i }));

    const confirm = await screen.findByRole('button', { name: /Yes, submit/i });
    await user.click(confirm);

    await waitFor(() => expect(saveEvaluation).toHaveBeenCalledTimes(1));
    const [interviewId, payload] = vi.mocked(saveEvaluation).mock.calls[0];
    expect(interviewId).toBe(1);
    expect(payload.submit).toBe(true);
    expect(payload.recommendation).toBe('Recommended');
    expect(payload.overallRating).toBe(4);
    expect(payload.items.filter((i: any) => i.rating != null)).toHaveLength(12);
  });
});
