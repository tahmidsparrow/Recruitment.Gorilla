import type { ReactNode } from 'react';
import { Card } from 'react-bootstrap';

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
 * "Stage Performance"-style stat card: label + accent icon chip, a big number, a
 * sub-label with a percentage, and a thin progress bar. Hovering recolors the whole
 * card to its tone accent (see .kpi-card styles in index.css).
 */
export default function KpiCard({ label, value, sub, percent, tone, icon }: KpiCardProps) {
  const display = typeof value === 'number' ? value.toLocaleString() : value;

  return (
    <Card className={`kpi-card kpi--${tone} h-100`}>
      <Card.Body className="py-3">
        <div className="d-flex justify-content-between align-items-start">
          <div className="text-muted small fw-medium">{label}</div>
          <div className="kpi-card__icon d-flex align-items-center justify-content-center">{icon}</div>
        </div>

        <div className="fw-bold lh-1 mt-2" style={{ fontSize: '1.75rem' }}>
          {display}
        </div>

        <div className="d-flex justify-content-between align-items-center mt-2 small">
          <span className="text-muted text-truncate">{sub}</span>
          {percent !== undefined && <span className="fw-semibold ms-2">{percent}%</span>}
        </div>

        {percent !== undefined && (
          <div className="kpi-card__bar mt-1">
            <div className="kpi-card__bar-fill" style={{ width: `${Math.min(100, Math.max(0, percent))}%` }} />
          </div>
        )}
      </Card.Body>
    </Card>
  );
}
