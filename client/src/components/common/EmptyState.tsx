import type { ReactNode } from 'react';
import { AlertTriangle, Inbox } from 'lucide-react';

/**
 * The "nothing here" panel, and — via `variant="error"` — the "this failed"
 * one. Replaces the bare `<p className="text-muted">No X found.</p>` that each
 * list page had its own version of.
 *
 * Three states are worth distinguishing and usually aren't:
 *   - an empty collection ("no candidates exist yet" — say how to make one)
 *   - an empty result ("nothing matches this filter" — say to loosen it)
 *   - a failure ("the request failed" — say how to retry)
 * Pass `description` for the first two; pass `variant="error"` for the third.
 * A failure rendered in the neutral empty style reads as "there is genuinely
 * nothing here", which is a different and wrong message, so it gets the danger
 * border and a distinct glyph.
 *
 * `page` is for a state that owns the whole screen rather than one section,
 * so it doesn't sit as a short band at the top of a tall blank page.
 */
export default function EmptyState({
  title,
  description,
  action,
  icon,
  variant = 'empty',
  page = false,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  /** Overrides the default glyph. Pass `null` to drop it entirely. */
  icon?: ReactNode | null;
  variant?: 'empty' | 'error';
  page?: boolean;
}) {
  const isError = variant === 'error';
  const glyph =
    icon === null
      ? null
      : (icon ??
        (isError ? (
          <AlertTriangle size={20} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Inbox size={20} strokeWidth={1.75} aria-hidden="true" />
        )));

  return (
    <div
      className={`empty-state${isError ? ' empty-state--error' : ''}${page ? ' empty-state--page' : ''}`}
      // A failure is announced; an empty list is just the (visible) result.
      role={isError ? 'alert' : undefined}
    >
      {glyph && <span className="empty-state__icon">{glyph}</span>}
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-description">{description}</div>}
      {action && <div className="empty-state__actions">{action}</div>}
    </div>
  );
}
