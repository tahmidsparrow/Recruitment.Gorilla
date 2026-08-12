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
 */
export default function PageHeader({ title, eyebrow, description, actions }: PageHeaderProps) {
  if (!title && !eyebrow && !description && !actions) return null;

  return (
    <div className="page-header">
      <div>
        {eyebrow && <span className="page-eyebrow">{eyebrow}</span>}
        {title && <h2>{title}</h2>}
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="page-header__actions">{actions}</div>}
    </div>
  );
}
