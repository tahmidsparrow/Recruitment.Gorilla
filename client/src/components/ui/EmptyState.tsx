import type { ReactNode } from 'react';

/**
 * The "nothing here" panel. Replaces the bare `<p className="text-muted">No X
 * found.</p>` that each list page had its own version of.
 *
 * Two states are worth distinguishing and usually aren't: an empty collection
 * ("no candidates exist yet" — tell them how to make one) and an empty result
 * ("nothing matches this filter" — tell them to loosen it). Pass `description`
 * accordingly.
 */
export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className="empty-state-title">{title}</div>
      {description && <div className="empty-state-description">{description}</div>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}
