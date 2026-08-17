import type { ReactNode } from 'react';

/**
 * A titled section on a card surface — the workhorse of the dashboard, the
 * candidate detail page and the evaluation report.
 *
 * This replaces the `<Card><Card.Body><div className="metric-label mb-3">…`
 * block that appeared eleven times across the app. Beyond the duplication,
 * that pattern used `.metric-label` (a 13px muted micro-label, meant for
 * naming a single figure) as the title of a whole section, so the heading over
 * a chart looked exactly like the caption under a number. `.section-title` is
 * a real heading and restores the page → section → content hierarchy.
 *
 * `flush` is for a section whose content is a table or a list that should meet
 * the card's border rather than sit inside its padding.
 */
export default function SectionCard({
  title,
  description,
  actions,
  children,
  flush = false,
  className = '',
  /** Renders the heading at a given level; the visual size is set by CSS. */
  as: Heading = 'h3',
}: {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  flush?: boolean;
  className?: string;
  as?: 'h2' | 'h3' | 'h4';
}) {
  const hasHead = Boolean(title || description || actions);

  return (
    <section className={`pulse-card${flush ? ' pulse-card--flush' : ''} ${className}`.trim()}>
      {hasHead && (
        <div className="pulse-card__head">
          <div className="min-w-0">
            {title && <Heading className="section-title">{title}</Heading>}
            {description && <p className="section-description">{description}</p>}
          </div>
          {actions && <div className="section-head__actions">{actions}</div>}
        </div>
      )}
      <div className="pulse-card__body">{children}</div>
    </section>
  );
}
