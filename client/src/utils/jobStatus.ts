/**
 * The single lifecycle state of a job opening.
 *
 * `isActive` and `endDate` used to be rendered as two independent facts — a
 * green "Active" badge in one column and red "· Closed" text in another — which
 * meant a row could assert both at once. They are not independent: an opening
 * past its end date is closed no matter what the flag says, and a deactivated
 * one is off the board regardless of the date. Collapsing them here makes that
 * precedence explicit and testable.
 */
export type JobStatus = 'open' | 'closing-soon' | 'closed' | 'inactive';

/** An opening this close to its end date is called out so it isn't missed. */
export const CLOSING_SOON_MS = 7 * 24 * 60 * 60 * 1000;

export interface JobStatusInput {
  isActive: boolean;
  /** ISO string. Absent means no deadline was set. */
  endDate?: string | null;
}

/**
 * Precedence: deactivated beats everything, then the deadline. `now` is
 * injectable so the boundary can be tested without freezing the clock.
 */
export function jobStatus(job: JobStatusInput, now: number = Date.now()): JobStatus {
  if (!job.isActive) return 'inactive';
  if (!job.endDate) return 'open';

  const remaining = new Date(job.endDate).getTime() - now;
  // An unparseable date is not evidence the opening closed — leave it open
  // rather than inventing a deadline.
  if (Number.isNaN(remaining)) return 'open';

  if (remaining < 0) return 'closed';
  if (remaining <= CLOSING_SOON_MS) return 'closing-soon';
  return 'open';
}

/** Badge class + label for a status. Classes are the .badge-pill set in index.css. */
export const JOB_STATUS_BADGE: Record<JobStatus, { className: string; label: string }> = {
  open: { className: 'badge-pill badge-success', label: 'Open' },
  'closing-soon': { className: 'badge-pill badge-warning', label: 'Closing soon' },
  closed: { className: 'badge-pill badge-danger', label: 'Closed' },
  inactive: { className: 'badge-pill badge-neutral', label: 'Inactive' },
};
