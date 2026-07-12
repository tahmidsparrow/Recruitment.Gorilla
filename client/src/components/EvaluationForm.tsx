import { useMemo, useState } from 'react';
import { Alert, Button, Card, Collapse, Form, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveEvaluation } from '../services/api';
import { useToast } from './ToastStack';
import {
  ALL_CRITERION_KEYS,
  EVALUATION_SECTIONS,
  RATING_SCALE,
  RECOMMENDATIONS,
  type CriteriaSection,
} from '../utils/evaluationCriteria';
import type { EvaluationItem, InterviewEvaluation } from '../types';

type ItemMap = Record<string, { rating: number | null; comment: string }>;

const buildItemMap = (items: EvaluationItem[]): ItemMap => {
  const map: ItemMap = {};
  for (const it of items) map[it.criterionKey] = { rating: it.rating, comment: it.comment ?? '' };
  return map;
};

const recLabel = (value: string | null) =>
  RECOMMENDATIONS.find((r) => r.value === value)?.label ?? value ?? '—';

const ratingTitle = (n: number) => RATING_SCALE.find((r) => r.value === n)?.label ?? `${n}`;

/* Per-section icons (inline SVG, currentColor). */
const SECTION_ICONS: Record<string, React.ReactNode> = {
  A: ( // graduation cap — background & education
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 4 2 9l10 5 10-5-10-5zM6 11.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-4.5M22 9v5" />
    </svg>
  ),
  B: ( // code brackets — technical skills
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="m8 6-6 6 6 6M16 6l6 6-6 6" />
    </svg>
  ),
  C: ( // chat bubble — soft skills & communication
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 0 1-8 8H4l2-3a8 8 0 1 1 15-5z" />
    </svg>
  ),
  D: ( // heart — cultural fit & motivation
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 21s-8-5.3-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.7-8 11-8 11z" />
    </svg>
  ),
};

const ChevronIcon = ({ open }: { open: boolean }) => (
  <svg
    className={`eval-panel__chevron${open ? ' eval-panel__chevron--open' : ''}`}
    viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/** Section stats from the current item map: rated count + average. */
const sectionStats = (section: CriteriaSection, itemMap: ItemMap) => {
  const ratings = section.criteria
    .map((c) => itemMap[c.key]?.rating)
    .filter((r): r is number => r != null);
  const avg = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null;
  return { rated: ratings.length, total: section.criteria.length, avg };
};

const RatingDots = ({ rating }: { rating: number | null }) => (
  <span className="rating-dots" title={rating != null ? ratingTitle(rating) : 'Not rated'}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`rating-dot${rating != null && n <= rating ? ' rating-dot--filled' : ''}`} />
    ))}
    <span className="ms-1 small text-muted">{rating ?? '—'}</span>
  </span>
);

/** Read-only rendering of a submitted (or other interviewer's) evaluation. */
export function EvaluationReadOnly({ evaluation }: { evaluation: InterviewEvaluation }) {
  const itemMap = buildItemMap(evaluation.items);
  return (
    <div>
      {EVALUATION_SECTIONS.map((section) => (
        <div key={section.id} className={`eval-panel eval-panel--${section.id.toLowerCase()}`}>
          <div className="eval-panel__header">
            <span className="eval-panel__icon">{SECTION_ICONS[section.id]}</span>
            <span className="eval-panel__title">{section.title}</span>
          </div>
          <div className="eval-panel__body pt-0">
            {section.criteria.map((c) => {
              const v = itemMap[c.key];
              return (
                <div key={c.key} className="eval-criterion">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <span className="fw-medium">{c.label}</span>
                    <RatingDots rating={v?.rating ?? null} />
                  </div>
                  {v?.comment && <div className="text-muted small readonly-value mt-1">{v.comment}</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <div className="mt-3">
        {evaluation.generalAssessment && (
          <div className="mb-2"><div className="text-muted small">General assessment</div><div className="readonly-value">{evaluation.generalAssessment}</div></div>
        )}
        <div className="mb-2">
          <div className="text-muted small">Final recommendation</div>
          <div>
            {recLabel(evaluation.recommendation)}
            {evaluation.recommendation === 'Other' && evaluation.recommendationOther
              ? `: ${evaluation.recommendationOther}`
              : ''}
          </div>
        </div>
        <div className="mb-2"><div className="text-muted small">Overall rating</div><RatingDots rating={evaluation.overallRating} /></div>
        {evaluation.isSubmitted && evaluation.submittedAt && (
          <p className="text-muted small mb-0">
            Submitted {new Date(evaluation.submittedAt).toLocaleString()} by {evaluation.interviewerName}
          </p>
        )}
      </div>
    </div>
  );
}

/** Editable evaluation form for the assigned interviewer; locks once submitted. */
export default function EvaluationForm({
  interviewId,
  evaluation,
}: {
  interviewId: number;
  evaluation: InterviewEvaluation | null;
}) {
  const { addToast } = useToast();
  const queryClient = useQueryClient();
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  const [items, setItems] = useState<ItemMap>(buildItemMap(evaluation?.items ?? []));
  const [generalAssessment, setGeneralAssessment] = useState(evaluation?.generalAssessment ?? '');
  const [recommendation, setRecommendation] = useState(evaluation?.recommendation ?? '');
  const [recommendationOther, setRecommendationOther] = useState(evaluation?.recommendationOther ?? '');
  const [overallRating, setOverallRating] = useState<string>(evaluation?.overallRating?.toString() ?? '');
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    () => Object.fromEntries(EVALUATION_SECTIONS.map((s) => [s.id, true]))
  );

  const submitted = evaluation?.isSubmitted ?? false;

  const payload = useMemo(
    () => ({
      generalAssessment: generalAssessment.trim() || null,
      recommendation: recommendation || null,
      recommendationOther: recommendation === 'Other' ? recommendationOther.trim() || null : null,
      overallRating: overallRating ? Number(overallRating) : null,
      items: Object.entries(items).map(([criterionKey, v]) => ({
        criterionKey,
        rating: v.rating,
        comment: v.comment.trim() || null,
      })),
    }),
    [generalAssessment, recommendation, recommendationOther, overallRating, items]
  );

  const mutation = useMutation({
    mutationFn: (submit: boolean) => saveEvaluation(interviewId, { ...payload, submit }),
    onSuccess: (_data, submit) => {
      void queryClient.invalidateQueries({ queryKey: ['interview', interviewId] });
      void queryClient.invalidateQueries({ queryKey: ['my-interviews'] });
      addToast(submit ? 'Evaluation submitted.' : 'Draft saved.');
      setConfirmSubmit(false);
    },
    onError: () => addToast('Could not save the evaluation.', 'danger'),
  });

  if (submitted && evaluation) {
    return (
      <Card>
        <Card.Body>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">Your evaluation</h5>
            <span className="badge bg-success-subtle text-success">Submitted</span>
          </div>
          <EvaluationReadOnly evaluation={evaluation} />
        </Card.Body>
      </Card>
    );
  }

  const setItem = (key: string, patch: Partial<{ rating: number | null; comment: string }>) =>
    setItems((prev) => ({
      ...prev,
      [key]: { rating: prev[key]?.rating ?? null, comment: prev[key]?.comment ?? '', ...patch },
    }));

  const toggleSection = (id: string) =>
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));

  const ratedCount = ALL_CRITERION_KEYS.filter((k) => items[k]?.rating != null).length;
  const allRated = ratedCount === ALL_CRITERION_KEYS.length;
  const otherMissing = recommendation === 'Other' && !recommendationOther.trim();
  const recommendationMissing = !recommendation;
  const overallMissing = !overallRating;

  const onSubmitClick = () => {
    if (!allRated) {
      setShowErrors(true);
      addToast(`Please rate all ${ALL_CRITERION_KEYS.length} evaluation criteria before submitting.`, 'danger');
      return;
    }
    if (recommendationMissing) {
      setShowErrors(true);
      addToast('Please select a final recommendation.', 'danger');
      return;
    }
    if (otherMissing) {
      setShowErrors(true);
      addToast('Please specify the recommendation for "Other".', 'danger');
      return;
    }
    if (overallMissing) {
      setShowErrors(true);
      addToast('Please select an overall rating.', 'danger');
      return;
    }
    setConfirmSubmit(true);
  };

  return (
    <Card>
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-1">
          <h5 className="mb-0">Interview Evaluation</h5>
          <span className={`small${showErrors && !allRated ? ' text-danger' : ' text-muted'}`}>
            Rated {ratedCount} of {ALL_CRITERION_KEYS.length}
            <span className="text-danger"> *</span>
          </span>
        </div>
        <div className="eval-progress__bar mb-3" role="progressbar" aria-valuenow={ratedCount} aria-valuemin={0} aria-valuemax={ALL_CRITERION_KEYS.length}>
          <div className="eval-progress__fill" style={{ width: `${(ratedCount / ALL_CRITERION_KEYS.length) * 100}%` }} />
        </div>

        {EVALUATION_SECTIONS.map((section) => {
          const open = openSections[section.id] ?? true;
          const stats = sectionStats(section, items);
          return (
            <div key={section.id} className={`eval-panel eval-panel--${section.id.toLowerCase()}`}>
              <button
                type="button"
                className="eval-panel__header"
                onClick={() => toggleSection(section.id)}
                aria-expanded={open}
                aria-controls={`eval-body-${section.id}`}
              >
                <span className="eval-panel__icon">{SECTION_ICONS[section.id]}</span>
                <span>
                  <span className="eval-panel__title d-block">{section.title}</span>
                  <span className="eval-panel__hint">{section.description}</span>
                </span>
                <span className="eval-panel__meta">
                  <span className="eval-panel__count">
                    {stats.rated}/{stats.total} rated{stats.avg != null ? ` · avg ${stats.avg.toFixed(1)}` : ''}
                  </span>
                  <ChevronIcon open={open} />
                </span>
              </button>
              <Collapse in={open}>
                <div id={`eval-body-${section.id}`}>
                  <div className="eval-panel__body">
                    {section.criteria.map((c) => {
                      const v = items[c.key];
                      return (
                        <div key={c.key} className="eval-criterion">
                          <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
                            <div>
                              <div className="fw-medium">{c.label}</div>
                              {c.hint && <div className="text-muted small">{c.hint}</div>}
                            </div>
                            <div
                              className={`rating-group${showErrors && v?.rating == null ? ' rating-group--invalid' : ''}`}
                              role="group"
                              aria-label={`${c.label} rating`}
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <button
                                  key={n}
                                  type="button"
                                  title={ratingTitle(n)}
                                  aria-pressed={v?.rating === n}
                                  className={`rating-btn${v?.rating === n ? ' rating-btn--selected' : ''}`}
                                  onClick={() => setItem(c.key, { rating: v?.rating === n ? null : n })}
                                >
                                  {n}
                                </button>
                              ))}
                            </div>
                          </div>
                          <Form.Control
                            className="mt-2 eval-comment-input"
                            size="sm"
                            placeholder="Comments / observations"
                            value={v?.comment ?? ''}
                            onChange={(e) => setItem(c.key, { comment: e.target.value })}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </Collapse>
            </div>
          );
        })}

        <div className="eval-panel mt-3" style={{ '--eval-accent': 'var(--ms-primary)', '--eval-tint': 'var(--ms-primary-tint)' } as React.CSSProperties}>
          <div className="eval-panel__header">
            <span className="eval-panel__icon">
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M9 12l2 2 4-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
              </svg>
            </span>
            <span className="eval-panel__title">Summary & recommendation</span>
          </div>
          <div className="eval-panel__body">
            <Form.Group className="mb-3">
              <Form.Label className="mb-1">General assessment</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Strengths / areas for improvement / red flags"
                value={generalAssessment}
                onChange={(e) => setGeneralAssessment(e.target.value)}
              />
            </Form.Group>

            <Form.Group className="mb-3">
              <Form.Label className={`mb-1${showErrors && recommendationMissing ? ' text-danger' : ''}`}>
                Final recommendation<span className="text-danger"> *</span>
              </Form.Label>
              {RECOMMENDATIONS.map((r) => (
                <div key={r.value}>
                  <Form.Check
                    type="radio"
                    name="recommendation"
                    id={`rec-${r.value}`}
                    label={<span><strong>{r.label}:</strong> <span className="text-muted small">{r.hint}</span></span>}
                    checked={recommendation === r.value}
                    onChange={() => setRecommendation(r.value)}
                  />
                  {r.value === 'Other' && recommendation === 'Other' && (
                    <Form.Control
                      className="mt-1"
                      size="sm"
                      placeholder="Please specify"
                      value={recommendationOther}
                      isInvalid={otherMissing}
                      onChange={(e) => setRecommendationOther(e.target.value)}
                    />
                  )}
                </div>
              ))}
            </Form.Group>

            <Form.Group className="mb-1">
              <Form.Label className={`mb-1 d-block${showErrors && overallMissing ? ' text-danger' : ''}`}>
                Overall rating<span className="text-danger"> *</span>
              </Form.Label>
              <div
                className={`rating-group${showErrors && overallMissing ? ' rating-group--invalid' : ''}`}
                role="group"
                aria-label="Overall rating"
              >
                {RATING_SCALE.map((r) => (
                  <button
                    key={r.value}
                    type="button"
                    title={r.label}
                    aria-pressed={overallRating === String(r.value)}
                    className={`rating-btn${overallRating === String(r.value) ? ' rating-btn--selected' : ''}`}
                    onClick={() => setOverallRating(overallRating === String(r.value) ? '' : String(r.value))}
                  >
                    {r.value}
                  </button>
                ))}
              </div>
            </Form.Group>
          </div>
        </div>

        <div className="d-flex gap-2 mt-3">
          <Button variant="outline-secondary" disabled={mutation.isPending} onClick={() => mutation.mutate(false)}>
            {mutation.isPending ? 'Saving…' : 'Save draft'}
          </Button>
          <Button variant="primary" disabled={mutation.isPending} onClick={onSubmitClick}>
            Submit
          </Button>
        </div>
      </Card.Body>

      <Modal show={confirmSubmit} onHide={() => setConfirmSubmit(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Submit evaluation</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Once submitted, this evaluation is <strong>locked</strong> and can no longer be edited.
          Continue?
          {mutation.isError && <Alert variant="danger" className="mt-3 mb-0">Submit failed. Please try again.</Alert>}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setConfirmSubmit(false)}>Cancel</Button>
          <Button variant="primary" disabled={mutation.isPending} onClick={() => mutation.mutate(true)}>
            {mutation.isPending ? 'Submitting…' : 'Submit & lock'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Card>
  );
}
