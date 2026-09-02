import type { ReactNode } from 'react';

/**
 * The root of every page.
 *
 * A page is a vertical stack of sections separated by `--stack-gap`, and this
 * is what applies that gap. Pages must not space their own sections with
 * `mb-3` / `mb-4` utilities: the whole point of the stack is that the distance
 * between a page header and its filter bar is the same distance as between
 * that filter bar and its table, on every page, decided in one place.
 *
 * Why it exists at all: the gap used to live on `.rg-content` in the shell.
 * That looked right but did nothing, because every page returned a single
 * wrapper element — `.rg-content` had one flex child, so there was never a
 * second child for the gap to fall between. Sections ended up flush against
 * each other, which is the "cards touching" this redesign was asked to fix.
 * Moving the gap onto the page's own root puts it where the siblings actually
 * are.
 */
export default function Page({
  children,
  className = '',
  /** Tighter rhythm, for a page whose sections are closely related. */
  tight = false,
}: {
  children: ReactNode;
  className?: string;
  tight?: boolean;
}) {
  return (
    <div className={`page-stack${tight ? ' page-stack--tight' : ''} ${className}`.trim()}>
      {children}
    </div>
  );
}
