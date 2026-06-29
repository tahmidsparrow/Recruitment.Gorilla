// Maps a candidate status to a Bootstrap contextual variant (theme-aware).
// Used for list badges, the detail status display, and timeline nodes/badges.

const STATUS_VARIANTS: Record<string, string> = {
  Reject: 'danger',
  'Not Recommended': 'danger',
  Discontinued: 'danger',
  Recommended: 'success',
  'Call for Interview': 'primary',
  'Interview Scheduled': 'primary',
  'Interview Completed': 'primary',
  'Technical Assessment': 'info',
  'Submission Receieved': 'info',
  'Code Review': 'info',
  'No Submission': 'secondary',
  'Not Available': 'secondary',
  Uploaded: 'light',
  'Ask for Assesment': 'light',
};

/** Bootstrap variant name (danger/success/primary/info/secondary/light) for a status. */
export const getStatusVariant = (status: string): string => STATUS_VARIANTS[status] ?? 'light';

/** Whether the badge needs dark text (light/neutral backgrounds). */
export const statusBadgeTextDark = (status: string): boolean => {
  const v = getStatusVariant(status);
  return v === 'light' || v === 'secondary';
};
