import { Link } from 'react-router-dom';

import { useQuery } from '@tanstack/react-query';
import { CalendarCheck } from 'lucide-react';
import { getMyInterviews } from '../../services/api';
import EmptyState from '../common/EmptyState';
import SectionCard from '../common/SectionCard';
import { SkeletonRows } from '../common/Loading';
import { Badge, type BadgeVariant } from '@/components/ui/badge';
import type { EvaluationState } from '../../types';

// Prism's glyph-carrying pill badges — status is never colour-alone.
const stateBadge: Record<EvaluationState, { variant: BadgeVariant; label: string }> = {
  None: { variant: 'neutral', label: 'Pending' },
  Draft: { variant: 'warning', label: 'Draft' },
  Submitted: { variant: 'success', label: 'Submitted' },
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
          <Badge variant="warning">{pending} awaiting evaluation</Badge>
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
        <ul className="list-group-flush">
          {data.map((i) => {
            const badge = stateBadge[i.evaluationState];
            return (
              <li key={i.id} className="list-row">
                <div className="list-row__main">
                  <Link to={`/interviews/${i.id}`} className="list-row__title">
                    {i.candidateName}
                  </Link>
                  <div className="list-row__meta">{i.role ?? '—'}</div>
                </div>
                <div className="list-row__aside">
                  {/* timeZoneName from develop's UTC work: the API returns UTC,
                      so the zone has to be shown or the time is ambiguous. */}
                  <div className={`list-row__meta${isSoon(i.scheduledAt) ? ' list-row__meta--urgent' : ''}`}>
                    {new Date(i.scheduledAt).toLocaleString(undefined, {
                      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
                      timeZoneName: 'short',
                    })}
                  </div>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </SectionCard>
  );
}
