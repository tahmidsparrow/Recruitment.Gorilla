import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Card, Col, Row, Spinner, Table } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getCandidateEvaluationReport } from '../services/api';
import { EvaluationReadOnly } from '../components/EvaluationForm';
import { EVALUATION_SECTIONS, RECOMMENDATIONS } from '../utils/evaluationCriteria';
import type { ReportEvaluation } from '../types';

const CRITERION_LABELS: Record<string, string> = Object.fromEntries(
  EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => [c.key, c.label]))
);
// Keep per-criterion rows in the same order as the evaluation form.
const CRITERION_ORDER = EVALUATION_SECTIONS.flatMap((s) => s.criteria.map((c) => c.key));

const recLabel = (value: string) =>
  RECOMMENDATIONS.find((r) => r.value === value)?.label ?? value;

const recVariant = (value: string): string =>
  value === 'Recommended' ? 'success'
    : value === 'Hold' ? 'warning'
    : value === 'Reject' ? 'danger'
    : 'secondary';

/** Small 1–5 dot meter mirroring the evaluation form's RatingDots. */
const RatingDots = ({ rating }: { rating: number | null }) => (
  <span className="rating-dots">
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`rating-dot${rating != null && n <= rating ? ' rating-dot--filled' : ''}`} />
    ))}
    <span className="ms-1 small text-muted">{rating != null ? rating.toFixed(1) : '—'}</span>
  </span>
);

export default function CandidateEvaluationReportPage() {
  const { id } = useParams();
  const candidateId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['evaluation-report', candidateId],
    queryFn: () => getCandidateEvaluationReport(candidateId),
    retry: false,
  });

  if (isLoading) {
    return <div className="d-flex justify-content-center py-5"><Spinner animation="border" /></div>;
  }

  if (error || !data) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <Alert variant={notFound ? 'warning' : 'danger'}>
        {notFound ? "This candidate's report isn't available to you." : 'Failed to load the report.'}{' '}
        <Link to="/candidates">Back to candidates</Link>
      </Alert>
    );
  }

  const { summary } = data;

  // Group the flat evaluation list by interview (round), preserving the newest-first order.
  const groups: { interviewId: number; scheduledAt: string; tags: string[]; evals: ReportEvaluation[] }[] = [];
  for (const r of data.evaluations) {
    let g = groups.find((x) => x.interviewId === r.interviewId);
    if (!g) {
      g = { interviewId: r.interviewId, scheduledAt: r.scheduledAt, tags: r.interviewTags, evals: [] };
      groups.push(g);
    }
    g.evals.push(r);
  }

  return (
    <div className="evaluation-report">
      <div className="d-print-none">
        <Link to={`/candidates/${candidateId}`} className="small">← Back to candidate</Link>
      </div>
      <div className="d-flex justify-content-between align-items-start my-3 flex-wrap gap-2">
        <div>
          <h2 className="mb-1">Evaluation report</h2>
          <div className="text-muted">
            {data.fullName}{data.roleApplied ? ` · ${data.roleApplied}` : ''}
          </div>
        </div>
        <Button variant="outline-secondary" className="d-print-none" onClick={() => window.print()}>
          Print
        </Button>
      </div>

      {summary.interviewerCount === 0 ? (
        <Alert variant="info">
          No submitted evaluations yet for this candidate. Once an interviewer submits and locks
          their evaluation, it will appear here.
        </Alert>
      ) : (
        <>
          <Card className="mb-4">
            <Card.Header>Summary — {summary.interviewerCount} interviewer{summary.interviewerCount === 1 ? '' : 's'}</Card.Header>
            <Card.Body>
              <Row className="g-4">
                <Col md={5}>
                  <div className="text-muted small">Average overall rating</div>
                  <div className="fs-4 fw-semibold">
                    {summary.averageOverall != null ? summary.averageOverall.toFixed(1) : '—'}
                    <span className="text-muted fs-6"> / 5</span>
                  </div>
                  <div className="text-muted small mt-3 mb-1">Recommendations</div>
                  <div className="d-flex flex-wrap gap-2">
                    {summary.recommendationCounts.length === 0
                      ? <span className="text-muted">—</span>
                      : summary.recommendationCounts.map((r) => (
                        <Badge key={r.recommendation} bg={recVariant(r.recommendation)}>
                          {recLabel(r.recommendation)}: {r.count}
                        </Badge>
                      ))}
                  </div>
                </Col>
                <Col md={7}>
                  <div className="text-muted small mb-1">Average by criterion</div>
                  <Table size="sm" className="mb-0 align-middle">
                    <tbody>
                      {CRITERION_ORDER
                        .map((key) => summary.criterionAverages.find((c) => c.criterionKey === key))
                        .filter((c): c is NonNullable<typeof c> => c != null)
                        .map((c) => (
                          <tr key={c.criterionKey}>
                            <td>{CRITERION_LABELS[c.criterionKey] ?? c.criterionKey}</td>
                            <td className="text-end" style={{ width: 140 }}>
                              <RatingDots rating={c.average} />
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </Table>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          {groups.map((g) => (
            <div key={g.interviewId} className="mb-4">
              <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                <h5 className="mb-0">
                  Interview · {new Date(g.scheduledAt).toLocaleString(undefined, {
                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
                  })}
                </h5>
                {g.tags.map((t) => <Badge key={t} bg="light" text="dark">{t}</Badge>)}
              </div>
              <Row className="g-3">
                {g.evals.map((r) => (
                  <Col key={r.evaluation.id} lg={6}>
                    <Card className="h-100">
                      <Card.Body>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <strong>{r.evaluation.interviewerName}</strong>
                          <span className="badge bg-success-subtle text-success">Submitted</span>
                        </div>
                        <EvaluationReadOnly evaluation={r.evaluation} />
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
