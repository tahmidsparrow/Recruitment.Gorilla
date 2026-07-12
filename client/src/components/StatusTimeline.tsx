import { Link } from 'react-router-dom';
import { StatusBadge, StatusDot } from './StatusBadge';
import { skillColorClass } from '../utils/skillColors';
import type { EvaluationSummary, StatusHistoryEntry } from '../types';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');

interface Props {
  history: StatusHistoryEntry[];
  /** Admin+ only: show a link from an "Interview Completed" entry to its evaluations. */
  canViewEvaluations?: boolean;
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

const formatDay = (iso: string) =>
  new Date(iso).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });

/** Older "Interview Completed" comments baked the summary in as text; hide that block —
 *  it now renders as structured cards from evaluationSummaries. */
const cleanComment = (comment: string) => comment.split('— Interview evaluations —')[0].trim();

/** Recommendation → status tone class (reuses the shared status-badge palette). */
const recTone = (rec: string | null): string => {
  switch (rec) {
    case 'Recommended': return 'status--success';
    case 'Hold': return 'status--intake';
    case 'Reject': return 'status--reject';
    default: return 'status--muted';
  }
};

const OverallDots = ({ rating }: { rating: number | null }) => (
  <span className="rating-dots" title={rating != null ? `Overall ${rating} of 5` : 'No overall rating'}>
    {[1, 2, 3, 4, 5].map((n) => (
      <span key={n} className={`rating-dot${rating != null && n <= rating ? ' rating-dot--filled' : ''}`} />
    ))}
    <span className="ms-1 small fw-semibold">{rating != null ? `${rating}/5` : '—'}</span>
  </span>
);

/** Rich per-interviewer evaluation summary cards for an "Interview Completed" entry. */
function EvaluationSummaries({ items }: { items: EvaluationSummary[] }) {
  return (
    <div className="eval-summary mt-2">
      <div className="eval-summary__head">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M9 12l2 2 4-5M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z" />
        </svg>
        Interview evaluations
        <span className="eval-summary__count">{items.length}</span>
      </div>
      <div className="eval-summary__grid">
        {items.map((e, idx) => (
          <div key={`${e.interviewerName}-${idx}`} className="eval-card">
            <span className="eval-card__avatar">{initials(e.interviewerName) || '?'}</span>
            <div className="eval-card__body">
              <div className="eval-card__top">
                <span className="eval-card__name">{e.interviewerName}</span>
                <span className={`status-badge ${recTone(e.recommendation)}`}>
                  {e.recommendation === 'Other'
                    ? e.recommendationOther?.trim() || 'Other'
                    : e.recommendation ?? 'No recommendation'}
                </span>
              </div>
              <div className="eval-card__meta">
                <OverallDots rating={e.overallRating} />
                {e.submittedAt && (
                  <span className="text-muted small">· {formatDay(e.submittedAt)}</span>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatusTimeline({ history, canViewEvaluations = false }: Props) {
  if (history.length === 0) {
    return <p className="text-muted">No status history yet.</p>;
  }

  return (
    <ul className="list-unstyled mb-0">
      {history.map((entry, i) => {
        const isLatest = i === 0;
        const isLast = i === history.length - 1;
        return (
          <li key={entry.id} className="d-flex">
            {/* node + connector rail */}
            <div className="d-flex flex-column align-items-center me-3">
              <StatusDot status={entry.status} style={{ marginTop: 4 }} />
              {!isLast && <span className="flex-grow-1 bg-secondary-subtle" style={{ width: 2 }} />}
            </div>

            <div className={isLast ? 'pb-1' : 'pb-4'}>
              <div className="d-flex align-items-center gap-2">
                <StatusBadge status={entry.status} />
                {isLatest && <span className="text-primary small fw-semibold">Current</span>}
              </div>
              <div className="text-muted small">
                {formatDate(entry.changedAt)} · {entry.changedBy}
              </div>
              {entry.comment && cleanComment(entry.comment) && (
                <div className="mt-1" style={{ whiteSpace: 'pre-line' }}>{cleanComment(entry.comment)}</div>
              )}
              {entry.evaluationSummaries.length > 0 && (
                <EvaluationSummaries items={entry.evaluationSummaries} />
              )}
              {canViewEvaluations &&
                entry.status === 'Interview Completed' &&
                entry.interviewId && (
                  <div className="mt-1 small">
                    <Link to={`/interviews/${entry.interviewId}`}>View full evaluations →</Link>
                  </div>
                )}
              {entry.taskDetails && (
                <div className="mt-1 small">
                  <span className="fw-semibold">Task:</span> {entry.taskDetails}
                </div>
              )}
              {entry.submissionUrl && (
                <div className="mt-1 small">
                  <span className="fw-semibold">Submission:</span>{' '}
                  <a href={entry.submissionUrl} target="_blank" rel="noreferrer">
                    {entry.submissionUrl}
                  </a>
                </div>
              )}
              {entry.interviewAt && (
                <div className="mt-1 small">
                  <span className="fw-semibold">Interview:</span> {formatDate(entry.interviewAt)}
                </div>
              )}
              {entry.interviewTags.length > 0 && (
                <div className="mt-2 d-flex flex-wrap gap-1">
                  {entry.interviewTags.map((tag) => (
                    <span key={tag} className={skillColorClass(tag)}>{tag}</span>
                  ))}
                </div>
              )}
              {entry.interviewers.length > 0 && (
                <div className="mt-2">
                  <div className="text-muted small mb-1">Interviewers</div>
                  <div className="d-flex flex-wrap gap-2">
                    {entry.interviewers.map((iv) => {
                      const pill = (
                        <span className="interviewer-pill">
                          <span className="interviewer-pill__avatar">{initials(iv.name) || '?'}</span>
                          {iv.name}
                        </span>
                      );
                      return entry.interviewId ? (
                        <Link key={iv.userId} to={`/interviews/${entry.interviewId}`} className="text-decoration-none">
                          {pill}
                        </Link>
                      ) : (
                        <span key={iv.userId}>{pill}</span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
