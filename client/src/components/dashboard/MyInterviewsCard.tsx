import { Link } from 'react-router-dom';
import { Card, ListGroup } from 'react-bootstrap';
import { useQuery } from '@tanstack/react-query';
import { getMyInterviews } from '../../services/api';
import type { EvaluationState } from '../../types';

// Prism's glyph-carrying pill badges — status is never colour-alone.
const stateBadge: Record<EvaluationState, { cls: string; label: string }> = {
  None: { cls: 'badge-pill badge-neutral', label: 'Pending' },
  Draft: { cls: 'badge-pill badge-warning', label: 'Draft' },
  Submitted: { cls: 'badge-pill badge-success', label: 'Submitted' },
};

const isSoon = (iso: string) => {
  const diff = new Date(iso).getTime() - Date.now();
  return diff > 0 && diff < 24 * 3600 * 1000;
};

/** Interviews the signed-in user is assigned to, with their evaluation state. */
export default function MyInterviewsCard() {
  const { data = [] } = useQuery({ queryKey: ['my-interviews'], queryFn: getMyInterviews });

  return (
    <Card className="h-100">
      <Card.Body>
        <div className="metric-label mb-3">My interviews</div>
        {data.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">No assigned interviews</div>
            <div className="empty-state-description">
              Interviews you're scheduled for will appear here.
            </div>
          </div>
        ) : (
          <ListGroup variant="flush">
            {data.map((i) => {
              const badge = stateBadge[i.evaluationState];
              return (
                <ListGroup.Item key={i.id} className="d-flex justify-content-between align-items-center gap-2">
                  <div className="min-w-0">
                    <Link to={`/interviews/${i.id}`} className="fw-medium text-decoration-none">
                      {i.candidateName}
                    </Link>
                    <div className="text-muted small text-truncate">{i.role ?? '—'}</div>
                  </div>
                  <div className="text-end flex-shrink-0">
                    <div className={`small ${isSoon(i.scheduledAt) ? 'text-danger fw-semibold' : ''}`}>
                      {new Date(i.scheduledAt).toLocaleString(undefined, {
                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      })}
                    </div>
                    <span className={`${badge.cls} mt-1`}>{badge.label}</span>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}
      </Card.Body>
    </Card>
  );
}
