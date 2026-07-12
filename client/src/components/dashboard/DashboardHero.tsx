import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getMyInterviews, getNotifications } from '../../services/api';
import { useAuth } from '../../auth/AuthContext';

const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
};

const today = new Date().toLocaleDateString(undefined, {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
});

/** A pending-task chip; links somewhere when `to` is set. */
function TaskChip({ to, children, tone = 'default' }: { to?: string; children: React.ReactNode; tone?: 'default' | 'accent' }) {
  const cls = `hero-chip${tone === 'accent' ? ' hero-chip--accent' : ''}`;
  return to ? <Link to={to} className={cls}>{children}</Link> : <span className={cls}>{children}</span>;
}

/**
 * Dashboard welcome kicker: greeting + user + date, and smart "pending task" chips built
 * from the caller's existing queries (no new endpoint). `inProcessCount` is passed in from
 * the dashboard payload for Recruiter+ (0/absent for interviewer-only users).
 */
export default function DashboardHero({ inProcessCount = 0 }: { inProcessCount?: number }) {
  const { user } = useAuth();

  const { data: interviews } = useQuery({ queryKey: ['my-interviews'], queryFn: getMyInterviews });
  const { data: notifications } = useQuery({ queryKey: ['notifications'], queryFn: getNotifications });

  const pending = (interviews ?? []).filter((i) => i.evaluationState !== 'Submitted');
  const upcoming = (interviews ?? [])
    .filter((i) => new Date(i.scheduledAt).getTime() >= Date.now())
    .sort((a, b) => +new Date(a.scheduledAt) - +new Date(b.scheduledAt));
  const next = upcoming[0];
  const unread = notifications?.unreadCount ?? 0;

  const nextTime = next
    ? new Date(next.scheduledAt).toLocaleString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' })
    : null;

  const nothingPending = pending.length === 0 && unread === 0 && inProcessCount === 0 && !next;

  return (
    <div className="dashboard-hero-kicker anim-fade-up mb-4">
      <div className="dashboard-hero-kicker__eyebrow">{today}</div>
      <h2 className="mb-1">{greeting()}, {user?.name ?? 'there'} 👋</h2>
      <p className="text-muted mb-3">Here's what needs your attention.</p>
      <div className="d-flex flex-wrap gap-2">
        {pending.length > 0 && (
          <TaskChip to={`/interviews/${pending[0].id}`} tone="accent">
            📝 {pending.length} evaluation{pending.length > 1 ? 's' : ''} to complete
          </TaskChip>
        )}
        {next && (
          <TaskChip to={`/interviews/${next.id}`}>
            📅 Next interview: {nextTime}
          </TaskChip>
        )}
        {unread > 0 && (
          <TaskChip>🔔 {unread} unread notification{unread > 1 ? 's' : ''}</TaskChip>
        )}
        {inProcessCount > 0 && (
          <TaskChip to="/candidates">👥 {inProcessCount} candidate{inProcessCount > 1 ? 's' : ''} in process</TaskChip>
        )}
        {nothingPending && <span className="text-muted">You're all caught up. 🎉</span>}
      </div>
    </div>
  );
}
