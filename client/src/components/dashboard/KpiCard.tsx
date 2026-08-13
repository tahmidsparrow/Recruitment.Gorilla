import type { ReactNode } from 'react';

export type KpiTone = 'orange' | 'teal' | 'green' | 'red' | 'blue' | 'purple';

interface KpiCardProps {
  label: string;
  value: number | string;
  sub?: string;
  /** 0–100. Drives the progress bar + right-aligned %; omit to hide the bar. */
  percent?: number;
  tone: KpiTone;
  icon: ReactNode;
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
export default function KpiCard({ label, value, sub, percent, tone, icon }: KpiCardProps) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <div className={`pulse-card kpi-card kpi--${tone} h-100`}>
      <div className="d-flex justify-content-between align-items-start gap-2">
        <div className="metric-label">{label}</div>
        <div className="kpi-card__icon d-flex align-items-center justify-content-center">{icon}</div>
      </div>

      <div className="metric-value">{display}</div>

      <div className="d-flex justify-content-between align-items-center mt-2" style={{ fontSize: 'var(--text-sm)' }}>
        <span className="text-truncate" style={{ color: 'var(--muted)' }}>{sub}</span>
        {percent !== undefined && <span className="fw-semibold ms-2">{percent}%</span>}
      </div>

      {percent !== undefined && (
        <div className="kpi-card__bar mt-1">
          <div
            className="kpi-card__bar-fill"
            style={{ width: `${Math.min(100, Math.max(0, percent))}%` }}
          />
        </div>
      )}
    </div>
  );
}
