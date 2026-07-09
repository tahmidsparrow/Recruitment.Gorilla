// Inline SVG icons for the dashboard KPI cards. No icon library is installed —
// this follows the house pattern of inlining SVGs (see ThemeToggle.tsx). Icons
// inherit `currentColor`, which the icon chip sets to white.

const base = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
};

/** Total — id card / people. */
export const IdCardIcon = () => (
  <svg {...base}>
    <rect x="2" y="4" width="20" height="16" rx="2" />
    <circle cx="8" cy="10" r="2" />
    <path d="M5 16c0-1.7 1.3-3 3-3s3 1.3 3 3M14 9h5M14 13h5" />
  </svg>
);

/** In process — hourglass. */
export const HourglassIcon = () => (
  <svg {...base}>
    <path d="M6 2h12M6 22h12M6 2c0 4 4 6 6 8M18 2c0 4-4 6-6 8M6 22c0-4 4-6 6-8M18 22c0-4-4-6-6-8" />
  </svg>
);

/** Recommended — person with check. */
export const PersonCheckIcon = () => (
  <svg {...base}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m16 11 2 2 4-4" />
  </svg>
);

/** Rejected — person with x. */
export const PersonXIcon = () => (
  <svg {...base}>
    <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="m17 10 5 5M22 10l-5 5" />
  </svg>
);

/** New this week — calendar with plus. */
export const CalendarPlusIcon = () => (
  <svg {...base}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4M8 2v4M3 10h18M12 14v4M10 16h4" />
  </svg>
);

/** Referred — share arrows. */
export const ShareIcon = () => (
  <svg {...base}>
    <circle cx="18" cy="5" r="3" />
    <circle cx="6" cy="12" r="3" />
    <circle cx="18" cy="19" r="3" />
    <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
  </svg>
);
