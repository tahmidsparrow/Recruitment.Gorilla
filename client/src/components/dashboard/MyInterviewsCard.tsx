import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { getMyInterviews } from '../../services/api';
import EmptyState from '../ui/EmptyState';
import SectionCard from '../ui/SectionCard';
import { SkeletonRows } from '../ui/Loading';
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
  const { data = [], isLoading } = useQuery({
    queryKey: ['my-interviews'],
    queryFn: getMyInterviews,
  });

  const pending = data.filter((i) => i.evaluationState !== 'Submitted').length;

  return (
    <SectionCard
      title="My interviews"
      description="Interviews you're assigned to, and where your evaluation stands."
      actions={
        pending > 0 ? (
          <span className="badge-pill badge-warning">{pending} awaiting evaluation</span>
        ) : undefined
      }
    >
      {isLoading ? (
        <SkeletonRows rows={2} label="Loading your interviews" />
      ) : data.length === 0 ? (
        <EmptyState
          icon={<CalendarCheck size={20} strokeWidth={1.75} aria-hidden="true" />}
          title="No assigned interviews"
          description="Interviews you're scheduled for will appear here."
        />
      ) : (
        // tabIndex makes the capped list scrollable by keyboard, which a plain
        // overflow container is not. The label names it, since to a screen
        // reader the region is otherwise an unnamed box of list items.
        <div
          className="feed-list"
          tabIndex={0}
          role="group"
          aria-label={`Assigned interviews, ${data.length} total`}
        >
          <ul className="feed-list__items">
            {data.map((i) => {
              const badge = stateBadge[i.evaluationState];
              const when = new Date(i.scheduledAt);
              const soon = isSoon(i.scheduledAt);
              return (
                <li key={i.id} className={`feed-row${soon ? ' feed-row--soon' : ''}`}>
                  {/* The tile reads as "Aug 10" to a screen reader; the time and
                      zone follow in the meta line, so the whole moment is
                      announced across the two without a hidden duplicate. */}
                  <time className="feed-date" dateTime={i.scheduledAt}>
                    <span className="feed-date__month">
                      {when.toLocaleString(undefined, { month: 'short' })}
                    </span>
                    <span className="feed-date__day">
                      {when.toLocaleString(undefined, { day: 'numeric' })}
                    </span>
                  </time>
                  <div className="feed-row__main">
                    <Link to={`/interviews/${i.id}`} className="feed-row__name">
                      {i.candidateName}
                    </Link>
                    <div className="feed-row__meta">
                      {i.role ?? '—'}
                      {' · '}
                      {/* timeZoneName from develop's UTC work: the API returns
                          UTC, so the zone has to be shown or the time is
                          ambiguous. */}
                      <span className={soon ? 'feed-row__time--soon' : undefined}>
                        {when.toLocaleString(undefined, {
                          hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
                        })}
                      </span>
                    </div>
                  </div>
                  <span className={badge.cls}>{badge.label}</span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </SectionCard>
  );
}
