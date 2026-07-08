// Resolves chart colors from the app's existing status design tokens so chart
// segments match the StatusBadge pills exactly and flip with the light/dark theme.
//
// The status tones live as CSS variables in index.css (--status-color per tone,
// with [data-bs-theme='dark'] overrides). We read the *computed* value off a
// probe element carrying the tone class, rather than duplicating hex codes here.

import { getStatusTone, type StatusTone } from './statusColors';

/** Neutral single-hue used for single-series magnitude charts (role, skills, trend). */
export const ACCENT: Record<'light' | 'dark', string> = {
  light: '#0078d4', // Fluent primary blue
  dark: '#6cb8f6',
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
  return value || '#605e5c';
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
        axis: '#b6b4b2',
        grid: 'rgba(255, 255, 255, 0.08)',
        tooltipBg: '#2b2b2b',
        tooltipBorder: '#444444',
        tooltipText: '#f3f2f1',
      }
    : {
        axis: '#605e5c',
        grid: 'rgba(0, 0, 0, 0.08)',
        tooltipBg: '#ffffff',
        tooltipBorder: '#e1dfdd',
        tooltipText: '#242424',
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
