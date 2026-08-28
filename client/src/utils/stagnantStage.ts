const TERMINAL_STATUSES = new Set(['Hired', 'Reject', 'Discontinued', 'Offer Declined']);

/**
 * Calculates the number of calendar days a candidate has spent in their current stage
 * based on updatedAt or createdAt timestamp.
 */
export function calculateDaysInStage(dateString?: string): number {
  if (!dateString) return 0;
  const stageDate = new Date(dateString);
  if (isNaN(stageDate.getTime())) return 0;
  const now = new Date();
  const diffMs = now.getTime() - stageDate.getTime();
  if (diffMs <= 0) return 0;
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Returns true if a non-terminal candidate has remained in the stage for >= thresholdDays.
 * Acceptance criteria specifies > 5 business days (default threshold is 5).
 */
export function isStageStagnant(
  dateString?: string,
  currentStatus?: string,
  thresholdDays = 5,
): boolean {
  if (!currentStatus || TERMINAL_STATUSES.has(currentStatus)) {
    return false;
  }
  const days = calculateDaysInStage(dateString);
  return days >= thresholdDays;
}

/**
 * Human friendly format for stage age badges (e.g. "< 1d", "3d", "7d").
 */
export function formatStageAge(days: number): string {
  if (days <= 0) return '< 1d';
  return `${days}d`;
}

/**
 * Calculates average days in stage for an array of candidates in a column.
 */
export function calculateAverageStageAge(dates: (string | undefined)[]): number {
  const validDates = dates.filter((d): d is string => !!d);
  if (validDates.length === 0) return 0;
  const totalDays = validDates.reduce((acc, d) => acc + calculateDaysInStage(d), 0);
  return Number((totalDays / validDates.length).toFixed(1));
}
