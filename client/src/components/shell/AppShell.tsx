import { useCallback, useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import NotificationBell from '../NotificationBell';
import SidebarNav from './SidebarNav';
import TopbarTitle from './TopbarTitle';

const STORAGE_KEY = 'rg-sidebar';

/** Desktop starts expanded unless the user collapsed it last time. */
function readCollapsed(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'collapsed';
  } catch {
    return false;
  }
}

/** Mobile starts with the drawer closed; desktop starts with it in the flow. */
function isMobile(): boolean {
  return typeof window !== 'undefined' && window.innerWidth < 768;
}

/**
 * The application chrome: a collapsible sidebar beside a scrolling main column
 * whose header is the sticky topbar. Ported from Prism's ShellClient.
 *
 * `visible` and `collapsed` are separate states because they mean different
 * things per breakpoint — on desktop "collapsed" is the 64px icon rail and
 * "hidden" removes the sidebar entirely; on mobile the sidebar is a drawer and
 * only "visible" matters.
 */
export default function AppShell() {
  const [collapsed, setCollapsed] = useState(readCollapsed);
  const [visible, setVisible] = useState(() => !isMobile());

  // Keep the drawer/rail sensible across a resize past the breakpoint —
  // otherwise a drawer closed on mobile stays invisible on desktop.
  useEffect(() => {
    const onResize = () => setVisible(!isMobile());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(STORAGE_KEY, next ? 'collapsed' : 'expanded');
      } catch {
        // A private-mode storage failure must not break the toggle.
      }
      return next;
    });
  }, []);

  const hide = useCallback(() => setVisible(false), []);
  const show = useCallback(() => setVisible(true), []);

  return (
    <div className="app-layout">
      <SidebarNav
        isVisible={visible}
        isCollapsed={collapsed}
        onToggleCollapse={toggleCollapse}
        onHide={hide}
      />

      {visible && (
        <button
          type="button"
          className="app-sidebar-scrim"
          onClick={hide}
          aria-label="Close navigation"
        />
      )}

      <div className="app-main">
        <header className="app-topbar">
          <button
            type="button"
            className="app-sidebar__icon-btn d-inline-grid d-md-none"
            onClick={show}
            aria-label="Open navigation"
            aria-expanded={visible}
          >
            <Menu size={18} strokeWidth={1.5} />
          </button>
          <TopbarTitle />
          <div className="app-topbar__actions">
            <NotificationBell />
          </div>
        </header>

        <div className="rg-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
