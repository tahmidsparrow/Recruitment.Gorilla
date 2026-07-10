import { useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Modal } from 'react-bootstrap';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { saveEvaluation } from '../services/api';
import { useToast } from './ToastStack';
import {
  EVALUATION_SECTIONS,
  RATING_SCALE,
  RECOMMENDATIONS,
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

/** Read-only rendering of a submitted (or other interviewer's) evaluation. */
export function EvaluationReadOnly({ evaluation }: { evaluation: InterviewEvaluation }) {
  const itemMap = buildItemMap(evaluation.items);
  return (
    <div>
      {EVALUATION_SECTIONS.map((section) => (
        <div key={section.id} className="eval-section">
          <h6 className="mb-1">{section.title}</h6>
          {section.criteria.map((c) => {
            const v = itemMap[c.key];
            return (
              <div key={c.key} className="eval-criterion">
                <div className="d-flex justify-content-between gap-2">
                  <span className="fw-medium">{c.label}</span>
                  <span>{v?.rating ?? '—'}</span>
                </div>
                {v?.comment && <div className="text-muted small readonly-value">{v.comment}</div>}
              </div>
            );
          })}
        </div>
      ))}
      <hr />
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
      <div className="mb-2"><div className="text-muted small">Overall rating</div><div>{evaluation.overallRating ?? '—'} / 5</div></div>
      {evaluation.isSubmitted && evaluation.submittedAt && (
        <p className="text-muted small mb-0">
          Submitted {new Date(evaluation.submittedAt).toLocaleString()} by {evaluation.interviewerName}
        </p>
      )}
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

  const [items, setItems] = useState<ItemMap>(buildItemMap(evaluation?.items ?? []));
  const [generalAssessment, setGeneralAssessment] = useState(evaluation?.generalAssessment ?? '');
  const [recommendation, setRecommendation] = useState(evaluation?.recommendation ?? '');
  const [recommendationOther, setRecommendationOther] = useState(evaluation?.recommendationOther ?? '');
  const [overallRating, setOverallRating] = useState<string>(evaluation?.overallRating?.toString() ?? '');

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

  const otherMissing = recommendation === 'Other' && !recommendationOther.trim();

  const onSubmitClick = () => {
    if (otherMissing) {
      addToast('Please specify the recommendation for "Other".', 'danger');
      return;
    }
    setConfirmSubmit(true);
  };

  return (
    <Card>
      <Card.Body>
        <h5 className="mb-3">Interview Evaluation</h5>

        {EVALUATION_SECTIONS.map((section) => (
          <div key={section.id} className="eval-section">
            <h6 className="mb-0">{section.title}</h6>
            <p className="text-muted small fst-italic mb-1">{section.description}</p>
            {section.criteria.map((c) => {
              const v = items[c.key];
              return (
                <div key={c.key} className="eval-criterion">
                  <div className="d-flex justify-content-between align-items-center gap-2">
                    <div>
                      <div className="fw-medium">{c.label}</div>
                      {c.hint && <div className="text-muted small">{c.hint}</div>}
                    </div>
                    <Form.Select
                      style={{ width: 90, flexShrink: 0 }}
                      value={v?.rating ?? ''}
                      onChange={(e) => setItem(c.key, { rating: e.target.value ? Number(e.target.value) : null })}
                    >
                      <option value="">—</option>
                      {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n}</option>)}
                    </Form.Select>
                  </div>
                  <Form.Control
                    className="mt-1"
                    size="sm"
                    placeholder="Comments / observations"
                    value={v?.comment ?? ''}
                    onChange={(e) => setItem(c.key, { comment: e.target.value })}
                  />
                </div>
              );
            })}
          </div>
        ))}

        <hr />

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
          <Form.Label className="mb-1">Final recommendation</Form.Label>
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

        <Form.Group className="mb-3" style={{ maxWidth: 220 }}>
          <Form.Label className="mb-1">Overall rating (1–5)</Form.Label>
          <Form.Select value={overallRating} onChange={(e) => setOverallRating(e.target.value)}>
            <option value="">—</option>
            {RATING_SCALE.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Form.Select>
        </Form.Group>

        <div className="d-flex gap-2">
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
