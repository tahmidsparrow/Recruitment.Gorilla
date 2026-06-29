// Maps a candidate status to a "tone" (a CSS design-token class). Colors live in
// index.css as CSS variables so they adapt to a future dark theme (data-bs-theme).
// Consumed by the shared StatusBadge / StatusDot components.

export type StatusTone =
  | 'reject'
  | 'success'
  | 'interview'
  | 'assessment'
  | 'muted'
  | 'uploaded'
  | 'intake';

const STATUS_TONE: Record<string, StatusTone> = {
  Reject: 'reject',
  'Not Recommended': 'reject',
  Discontinued: 'reject',
  Recommended: 'success',
  'Call for Interview': 'interview',
  'Interview Scheduled': 'interview',
  'Interview Completed': 'interview',
  'Technical Assessment': 'assessment',
  'Submission Receieved': 'assessment',
  'Code Review': 'assessment',
  'No Submission': 'muted',
  'Not Available': 'muted',
  Uploaded: 'uploaded',
  'Ask for Assesment': 'intake',
};

/** Tone key for a status (defaults to muted for unknown values). */
export const getStatusTone = (status: string): StatusTone => STATUS_TONE[status] ?? 'muted';

/** CSS modifier class carrying the status color tokens, e.g. "status--reject". */
export const getStatusClass = (status: string): string => `status--${getStatusTone(status)}`;
