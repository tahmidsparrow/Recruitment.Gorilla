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
              <span
                className={`rounded-circle border ${
                  isLatest ? 'bg-primary border-primary' : 'bg-white border-secondary'
                }`}
                style={{ width: 14, height: 14, marginTop: 4 }}
              />
              {!isLast && <span className="flex-grow-1 bg-secondary-subtle" style={{ width: 2 }} />}
            </div>

            <div className={isLast ? 'pb-1' : 'pb-4'}>
              <div className="d-flex align-items-center gap-2">
                <span className={`fw-semibold ${isLatest ? 'text-primary' : ''}`}>
                  {entry.status}
                </span>
                {isLatest && <span className="badge bg-primary-subtle text-primary">Current</span>}
              </div>
              <div className="text-muted small">
                {formatDate(entry.changedAt)} · {entry.changedBy}
              </div>
              {entry.comment && <div className="mt-1">{entry.comment}</div>}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
