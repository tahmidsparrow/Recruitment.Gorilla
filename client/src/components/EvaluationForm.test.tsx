import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../test/renderWithProviders';
import EvaluationForm from './EvaluationForm';

vi.mock('../services/api', () => ({ saveEvaluation: vi.fn() }));
import { saveEvaluation } from '../services/api';

describe('EvaluationForm submit gate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(saveEvaluation).mockResolvedValue({} as never);
  });

  it('blocks Submit until the rubric is complete', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationForm interviewId={1} evaluation={null} />);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    // The confirm modal must NOT open, a specific toast appears, and nothing is saved.
    expect(screen.queryByRole('button', { name: /Submit & lock/i })).not.toBeInTheDocument();
    expect(await screen.findByText(/Please rate all/i)).toBeInTheDocument();
    expect(saveEvaluation).not.toHaveBeenCalled();
  });

  it('opens the confirm modal and saves once all 12 ratings + recommendation + overall are set', async () => {
    const user = userEvent.setup();
    renderWithProviders(<EvaluationForm interviewId={1} evaluation={null} />);

    // Every rating pill showing "4": the 12 criteria groups + the overall-rating group.
    for (const btn of screen.getAllByRole('button', { name: '4' })) {
      await user.click(btn);
    }
    await user.click(screen.getByRole('radio', { name: /Recommended/i }));
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    const confirm = await screen.findByRole('button', { name: /Submit & lock/i });
    await user.click(confirm);

    await waitFor(() => expect(saveEvaluation).toHaveBeenCalledTimes(1));
    const [interviewId, payload] = vi.mocked(saveEvaluation).mock.calls[0];
    expect(interviewId).toBe(1);
    expect(payload.submit).toBe(true);
    expect(payload.recommendation).toBe('Recommended');
    expect(payload.overallRating).toBe(4);
    expect(payload.items.filter((i) => i.rating != null)).toHaveLength(12);
  });
});
