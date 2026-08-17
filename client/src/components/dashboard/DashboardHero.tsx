import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Bell, CalendarClock, CheckCircle2, ClipboardCheck } from 'lucide-react';
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
 * Dashboard welcome kicker: greeting + user + date, and "pending task" chips
 * built from the caller's existing queries (no new endpoint).
 *
 * The chips are strictly *the signed-in user's* outstanding work — evaluations
 * they owe, their next interview, their unread notifications. A chip counting
 * candidates in process was removed: it is a pipeline statistic, not a task,
 * it is already the "In process" KPI card directly below, and it made the row
 * read as a mix of "things you must do" and "things that are true".
 */
export default function DashboardHero() {
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

  const nothingPending = pending.length === 0 && unread === 0 && !next;

  return (
    <div className="dashboard-hero-kicker animate-fade-in-up">
      <div className="dashboard-hero-kicker__eyebrow">{today}</div>
      <h2 className="dashboard-hero-kicker__greeting">{greeting()}, {user?.name ?? 'there'}</h2>
      <p className="dashboard-hero-kicker__lede">
        {nothingPending ? 'Nothing needs your attention right now.' : "Here's what needs your attention."}
      </p>
      <div className="hero-chip-row">
        {pending.length > 0 && (
          <TaskChip to={`/interviews/${pending[0].id}`} tone="accent">
            <ClipboardCheck size={14} strokeWidth={1.75} aria-hidden="true" />
            {pending.length} evaluation{pending.length > 1 ? 's' : ''} to complete
          </TaskChip>
        )}
        {next && (
          <TaskChip to={`/interviews/${next.id}`}>
            <CalendarClock size={14} strokeWidth={1.75} aria-hidden="true" />
            Next interview: {nextTime}
          </TaskChip>
        )}
        {unread > 0 && (
          <TaskChip>
            <Bell size={14} strokeWidth={1.75} aria-hidden="true" />
            {unread} unread notification{unread > 1 ? 's' : ''}
          </TaskChip>
        )}
        {nothingPending && (
          <span className="hero-chip hero-chip--quiet">
            <CheckCircle2 size={14} strokeWidth={1.75} aria-hidden="true" />
            You're all caught up.
          </span>
        )}
      </div>
    </div>
  );
}
