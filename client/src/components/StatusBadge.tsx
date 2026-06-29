import { getStatusClass } from '../utils/statusColors';

/** Colored status pill driven by CSS design tokens (theme-aware). */
export function StatusBadge({ status, className = '' }: { status: string; className?: string }) {
  return <span className={`status-badge ${getStatusClass(status)} ${className}`.trim()}>{status}</span>;
}

/** Solid colored dot for the status timeline node. */
export function StatusDot({ status, style }: { status: string; style?: React.CSSProperties }) {
  return <span className={`status-dot ${getStatusClass(status)}`} style={style} />;
}
