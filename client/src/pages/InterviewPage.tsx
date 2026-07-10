import { Link, useParams } from 'react-router-dom';
import { Accordion, Alert, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getInterview } from '../services/api';
import ReadOnlyCandidateProfile from '../components/ReadOnlyCandidateProfile';
import EvaluationForm, { EvaluationReadOnly } from '../components/EvaluationForm';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 10h18M8 3v4M16 3v4" />
  </svg>
);

/** Relative label for the scheduled date: Today / Tomorrow / In N days / Completed. */
const relativeLabel = (scheduledAt: string): { label: string; soon: boolean } => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOfDay(new Date(scheduledAt)) - startOfDay(new Date())) / 86_400_000);
  if (days < 0) return { label: 'Completed', soon: false };
  if (days === 0) return { label: 'Today', soon: true };
  if (days === 1) return { label: 'Tomorrow', soon: true };
  return { label: `In ${days} days`, soon: false };
};

export default function InterviewPage() {
  const { id } = useParams();
  const interviewId = Number(id);

  const { data, isLoading, error } = useQuery({
    queryKey: ['interview', interviewId],
    queryFn: () => getInterview(interviewId),
    retry: false,
  });

  if (isLoading) {
    return <div className="d-flex justify-content-center py-5"><Spinner animation="border" /></div>;
  }

  if (error || !data) {
    const notFound = isAxiosError(error) && error.response?.status === 404;
    return (
      <Alert variant={notFound ? 'warning' : 'danger'}>
        {notFound
          ? "This interview isn't available to you."
          : 'Failed to load the interview.'}{' '}
        <Link to="/">Back to dashboard</Link>
      </Alert>
    );
  }

  const scheduled = new Date(data.scheduledAt).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
  const relative = relativeLabel(data.scheduledAt);
  const role = data.candidate.roleApplied ?? data.candidate.appliedRole;
  const otherEvaluations = (data.allEvaluations ?? []).filter(
    (e) => e.interviewerUserId !== data.myEvaluation?.interviewerUserId
  );

  return (
    <div>
      <div className="interview-hero mb-3 anim-fade-up">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <div className="me-auto">
            <div className="interview-hero__eyebrow">Interview</div>
            <h2 className="mb-0">{data.candidate.fullName}</h2>
            {role && <div className="text-muted">{role}</div>}
          </div>
          <span className={`interview-chip${relative.soon ? ' interview-chip--soon' : ''}`}>
            <CalendarIcon /> {scheduled} · {relative.label}
          </span>
        </div>
        <div className="d-flex flex-wrap align-items-center gap-2 mt-3">
          <span className="text-muted small">Interviewers:</span>
          {data.interviewers.map((i) => (
            <span key={i.userId} className="interviewer-pill">
              <span className="interviewer-pill__avatar">{initials(i.name) || '?'}</span>
              {i.name}
            </span>
          ))}
        </div>
      </div>

      <Row className="g-3">
        <Col lg={5} className="anim-fade-up" style={{ animationDelay: '60ms' }}>
          <ReadOnlyCandidateProfile candidate={data.candidate} />
        </Col>
        <Col lg={7} className="anim-fade-up" style={{ animationDelay: '120ms' }}>
          {data.canEvaluate ? (
            <EvaluationForm interviewId={interviewId} evaluation={data.myEvaluation} />
          ) : (
            <Alert variant="info">You are viewing this interview but are not an assigned interviewer.</Alert>
          )}

          {data.allEvaluations && otherEvaluations.length > 0 && (
            <Accordion className="mt-3">
              <Accordion.Item eventKey="others">
                <Accordion.Header>Other interviewers' evaluations ({otherEvaluations.length})</Accordion.Header>
                <Accordion.Body>
                  {otherEvaluations.map((e) => (
                    <div key={e.id} className="mb-4">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong>{e.interviewerName}</strong>
                        <span className={`badge ${e.isSubmitted ? 'bg-success-subtle text-success' : 'bg-secondary-subtle text-secondary'}`}>
                          {e.isSubmitted ? 'Submitted' : 'Draft'}
                        </span>
                      </div>
                      <EvaluationReadOnly evaluation={e} />
                    </div>
                  ))}
                </Accordion.Body>
              </Accordion.Item>
            </Accordion>
          )}
        </Col>
      </Row>
    </div>
  );
}
