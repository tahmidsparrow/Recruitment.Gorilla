import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export type KpiTone = 'orange' | 'teal' | 'green' | 'red' | 'blue' | 'purple';

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  /** 0–100. Drives the progress bar + right-aligned %; omit to hide the bar. */
  percent?: number;
  tone: KpiTone;
  icon: ReactNode;
  /**
   * Where the tile drills through to. Only pass one when the destination shows
   * *exactly* the same set this tile counts — a stat that opens a list with a
   * different total is worse than a stat that doesn't open at all. Tiles
   * without it render as plain, non-interactive figures.
   */
  to?: string;
}

/**
 * Stat tile on Prism's .metric-card geometry: flat, border-led, no shadow, a
 * muted 13px label over a 28px value.
 *
 * The per-tone accent is kept. Prism uses a single fill for its charts because
 * those rank nominal categories where colour would restate the bar length —
 * but here the six tones map to distinct pipeline stages (in-process,
 * recommended, rejected…) and carry meaning the number alone doesn't.
 */
export default function KpiCard({ label, value, sub, percent, tone, icon, to }: KpiCardProps) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;

  const body = (
    <>
      <div className="kpi-card__top">
        <div className="metric-label">{label}</div>
        <div className="kpi-card__top-right">
          {/* Persistent, not hover-only: a cue that appears only under the
              pointer can't tell you the tile is a link before you find it, and
              these sit beside tiles that aren't. Grouped with the icon in the
              action corner rather than inline with the label (where a longer
              label wrapped it onto its own line) or in the foot (where it
              truncated "All candidates"). */}
          {to && (
            <ArrowUpRight
              size={14}
              strokeWidth={2.25}
              aria-hidden="true"
              className="kpi-card__go"
            />
          )}
          <div className="kpi-card__icon">{icon}</div>
        </div>
      </div>

      <div className="metric-value">{display}</div>

      <div className="kpi-card__foot">
        <span className="kpi-card__sub">{sub}</span>
        {percent !== undefined && <span className="kpi-card__pct">{percent}%</span>}
      </div>

      {percent !== undefined && (
        <div className="kpi-card__bar">
          <div
            className="kpi-card__bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </>
  );

  const className = `pulse-card kpi-card kpi--${tone}`;

  if (!to) return <div className={className}>{body}</div>;

  return (
    <Link
      to={to}
      className={`${className} kpi-card--link`}
      aria-label={`${label}: ${display}. View these candidates.`}
    >
      {body}
    </Link>
  );
}
