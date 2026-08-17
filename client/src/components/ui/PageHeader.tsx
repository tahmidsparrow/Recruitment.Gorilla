import type { ReactNode } from 'react';

type PageHeaderProps = {
  /**
   * Usually omitted: the topbar already shows the page title, so repeating it
   * here would print it twice. Pass one only for a *section* heading inside a
   * page, or when the heading is content rather than chrome (a candidate's
   * name, say).
   */
  title?: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  /** Right-aligned controls — the primary action for the page. */
  actions?: ReactNode;
};

/**
 * The band above a page's content. Replaces the
 * `d-flex justify-content-between align-items-center mb-4` + `<h2>` block that
 * was copy-pasted across six pages.
 *
 * Note the `--actions-only` case: most pages pass actions and no title,
 * because the topbar owns the title. Rendering an empty left-hand `<div>` to
 * push the buttons right leaves a zero-width flex child that still takes part
 * in wrapping, so the buttons could drop to their own line while the empty div
 * held the first. Switching the justification instead is what actually keeps
 * a lone action cluster on the right.
 */
export default function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  const hasText = Boolean(title || eyebrow || description);
  if (!hasText && !actions) return null;

  return (
    <div className={`page-header${!hasText ? ' page-header--actions-only' : ''}`}>
      {hasText && (
        <div className="page-header__text">
          {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
