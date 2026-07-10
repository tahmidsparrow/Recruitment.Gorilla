import { Link, useParams } from 'react-router-dom';
import { Accordion, Alert, Col, Row, Spinner } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { getInterview } from '../services/api';
import ReadOnlyCandidateProfile from '../components/ReadOnlyCandidateProfile';
import EvaluationForm, { EvaluationReadOnly } from '../components/EvaluationForm';

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
  const otherEvaluations = (data.allEvaluations ?? []).filter(
    (e) => e.interviewerUserId !== data.myEvaluation?.interviewerUserId
  );

  return (
    <div>
      <div className="mb-3">
        <h2 className="mb-1">Interview</h2>
        <div className="text-muted">
          {scheduled} · Interviewers: {data.interviewers.map((i) => i.name).join(', ')}
        </div>
      </div>

      <Row className="g-3">
        <Col lg={5}>
          <ReadOnlyCandidateProfile candidate={data.candidate} />
        </Col>
        <Col lg={7}>
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
