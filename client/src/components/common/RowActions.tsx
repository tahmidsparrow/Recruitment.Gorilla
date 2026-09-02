import type { ReactNode } from 'react';
import { Dropdown } from 'react-bootstrap';
import { MoreVertical } from 'lucide-react';

/**
 * The overflow menu at the end of a table row.
 *
 * Why this exists: every list in the app used to end each row with one or more
 * full buttons — a red "Delete" on the candidates table, "Edit / Reset
 * password / Deactivate" on the users table. Two consequences, both bad:
 *
 *   1. The most destructive action in the product was rendered forty times
 *      per screen, in the app's danger colour, at full button weight. The
 *      loudest thing on the candidates page was the way to destroy a
 *      candidate.
 *   2. The actions column had to be as wide as the widest label, so on the
 *      users page it pushed the table past the viewport — which is the
 *      horizontal scrollbar visible in the current build.
 *
 * A single 30px trigger fixes both. The actions are one click further away,
 * which is the correct trade for operations you perform rarely and must not
 * perform accidentally.
 */
export default function RowActions({
  children,
  label = 'Row actions',
}: {
  children: ReactNode;
  /** Announced on the trigger — pass the record's name for a useful one. */
  label?: string;
}) {
  return (
    <Dropdown align="end" className="row-actions">
      <Dropdown.Toggle
        as="button"
        type="button"
        className="btn btn-ghost btn-sm btn-icon"
        aria-label={label}
      >
        <MoreVertical size={16} strokeWidth={2} aria-hidden="true" />
      </Dropdown.Toggle>
      <Dropdown.Menu renderOnMount className="menu-panel">
        {children}
      </Dropdown.Menu>
    </Dropdown>
  );
}

/** One entry. `tone="danger"` for a destructive one — it is the only place in
 *  a row where danger colour is spent, and it is behind a deliberate click. */
export function RowAction({
  icon,
  children,
  onClick,
  tone = 'default',
  disabled,
}: {
  icon?: ReactNode;
  children: ReactNode;
  onClick: () => void;
  tone?: 'default' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      className={`menu-item${tone === 'danger' ? ' menu-item--danger' : ''}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon}
      <span className="menu-item__label">{children}</span>
    </button>
  );
}
