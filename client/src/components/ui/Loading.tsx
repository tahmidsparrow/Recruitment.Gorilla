import { Spinner } from 'react-bootstrap';

/**
 * Loading states.
 *
 * The app previously showed a bare `<Spinner>` in five different shapes — a
 * centred one on the dashboard, an inline one on Users, a small one in the
 * config tabs — and each one collapsed the page to nothing while it span, so
 * the layout jumped when data landed.
 *
 * The rule here: if the shape of what is coming is known, hold that shape with
 * a skeleton. Only fall back to a spinner when it isn't — an action in flight,
 * or a route still deciding what to render.
 *
 * Skeletons are `aria-hidden` and the region carries `aria-busy`, so a screen
 * reader is told "busy" once rather than read a wall of empty boxes.
 */

type SkeletonVariant = 'text' | 'line' | 'row' | 'card' | 'chart';

/** A single placeholder block. `width` accepts any CSS length or percentage. */
export function Skeleton({
  variant = 'line',
  width,
  className = '',
}: {
  variant?: SkeletonVariant;
  width?: string;
  className?: string;
}) {
  return (
    <span
      className={`skeleton skeleton--${variant} ${className}`.trim()}
      style={width ? { width } : undefined}
      aria-hidden="true"
    />
  );
}

/** `count` stacked lines, the last one short so it reads as a paragraph end. */
export function SkeletonText({ count = 3 }: { count?: number }) {
  return (
    <span className="skeleton-group" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span
          key={i}
          className="skeleton skeleton--text"
          style={{ width: i === count - 1 ? '60%' : '100%' }}
        />
      ))}
    </span>
  );
}

/** Placeholder for a list or table that is still loading. */
export function SkeletonRows({ rows = 5, label = 'Loading' }: { rows?: number; label?: string }) {
  return (
    <div className="skeleton-group" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} className="skeleton skeleton--row" aria-hidden="true" />
      ))}
    </div>
  );
}

/** Placeholder for a grid of cards — KPI tiles, job cards. */
export function SkeletonCards({ count = 6, label = 'Loading' }: { count?: number; label?: string }) {
  return (
    <div className="metric-grid" role="status" aria-busy="true" aria-label={label}>
      {Array.from({ length: count }, (_, i) => (
        <span key={i} className="skeleton skeleton--card" aria-hidden="true" />
      ))}
    </div>
  );
}

/**
 * Centred spinner with a label, for the cases a skeleton can't serve: a whole
 * route resolving, or work in flight with no shape to preview.
 */
export default function LoadingPanel({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="loading-panel" role="status" aria-busy="true">
      <Spinner animation="border" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
