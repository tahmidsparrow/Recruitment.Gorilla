import { StatusBadge, StatusDot } from './StatusBadge';
import type { StatusHistoryEntry } from '../types';

interface Props {
  history: StatusHistoryEntry[];
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

export default function StatusTimeline({ history }: Props) {
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
              {entry.comment && <div className="mt-1">{entry.comment}</div>}
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
            </div>
          </li>
        );
      })}
    </ul>
  );
}
