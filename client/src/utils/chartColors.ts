// Resolves chart colors from the app's existing status design tokens so chart
// segments match the StatusBadge pills exactly and flip with the light/dark theme.
//
// The status tones live as CSS variables in index.css (--status-color per tone,
// with [data-bs-theme='dark'] overrides). We read the *computed* value off a
// probe element carrying the tone class, rather than duplicating hex codes here.

import { getStatusTone, type StatusTone } from './statusColors';

/** Brand single-hue used for single-series magnitude charts (role, skills, trend). */
export const ACCENT: Record<'light' | 'dark', string> = {
  light: '#468189', // Coastal primary teal
  dark: '#8fc6cc',
};

/**
 * Reads the resolved `--status-color` hex for a tone under the current theme.
 * A hidden probe is appended to <body> (inside the html[data-bs-theme] scope) so
 * the dark-mode overrides apply. Falls back to the muted grey if resolution fails.
 */
function resolveTone(tone: StatusTone): string {
  const probe = document.createElement('span');
  probe.className = `status--${tone}`;
  probe.style.display = 'none';
  document.body.appendChild(probe);
  const value = getComputedStyle(probe).getPropertyValue('--status-color').trim();
  probe.remove();
  return value || '#5f7d80';
}

/**
 * Builds a { status -> hex } map for the given statuses under the current theme.
 * Call from a component with `theme` in the dependency list so it recomputes on toggle.
 */
export function statusColorMap(statuses: string[]): Record<string, string> {
  const map: Record<string, string> = {};
  for (const status of statuses) {
    map[status] = resolveTone(getStatusTone(status));
  }
  return map;
}

/** Convenience: the accent hue for the active theme. */
export const accentFor = (theme: 'light' | 'dark'): string => ACCENT[theme];

/** Recessive axis/grid/tooltip colors for chart chrome, per theme. */
export interface ChartChrome {
  axis: string;
  grid: string;
  tooltipBg: string;
  tooltipBorder: string;
  tooltipText: string;
}

export const chartChrome = (theme: 'light' | 'dark'): ChartChrome =>
  theme === 'dark'
    ? {
        axis: '#a7c2c4',
        grid: 'rgba(255, 255, 255, 0.08)',
        tooltipBg: '#0e2833',
        tooltipBorder: '#244854',
        tooltipText: '#e9f1f0',
      }
    : {
        axis: '#31575c',
        grid: 'rgba(3, 25, 38, 0.08)',
        tooltipBg: '#ffffff',
        tooltipBorder: '#dbe4e3',
        tooltipText: '#031926',
      };

/**
 * Negative-terminal statuses (rejected / dropped). Excluded from the pipeline
 * funnel — they still appear in the full status donut. Mirrors the backend's
 * NegativeTerminal set in DashboardService.
 */
export const NEGATIVE_TERMINAL = new Set([
  'Reject',
  'Not Recommended',
  'Discontinued',
  'Not Available',
]);
