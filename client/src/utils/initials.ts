/**
 * Initials for an avatar chip — the first letter of the first two words.
 *
 * Extracted from StatusTimeline and InterviewPage, which each had their own
 * identical copy, when the sidebar's user card needed a third. Returns '' for
 * an empty or whitespace-only name; callers render their own placeholder.
 */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('');
}

/**
 * Same, but falls back to an email's local part when there is no display name —
 * "ada@example.com" gives "AD". Used where the only identity we can count on is
 * the login address.
 */
export function initialsOf(name: string | null | undefined, email?: string | null): string {
  const fromName = initials(name ?? '');
  if (fromName) return fromName;
  const local = (email ?? '').split('@')[0];
  return local.slice(0, 2).toUpperCase() || '?';
}
