import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ArrowRightFromLine, LoaderCircle, PanelLeftClose, X } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import BrandLogo from '../BrandLogo';
import { isRouteActive, visibleRoutes } from '../../navRoutes';

type SidebarNavProps = {
  isVisible: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
};

/**
 * The primary navigation: brand + collapse control, then the route list.
 *
 * The footer that used to sit below the list (theme toggle + the signed-in
 * user's card) moved to the topbar — see ThemeMenu and UserMenu. It held no
 * navigation, yet on a collapsed 64px rail it was one of the first things the
 * eye landed on, and account controls belong with the other chrome.
 */
export default function SidebarNav({
  isVisible,
  isCollapsed,
  onToggleCollapse,
  onHide,
}: SidebarNavProps) {
  const { user } = useAuth();
  const location = useLocation();
  const [pendingPath, setPendingPath] = useState<string | null>(null);

  const routes = visibleRoutes(user?.roles ?? []);

  // Clear the pending spinner once the route has actually changed.
  useEffect(() => {
    setPendingPath(null);
  }, [location.pathname]);

  const handleNavClick = (path: string) => {
    if (!isRouteActive(location.pathname, path)) setPendingPath(path);
    // On mobile the sidebar is a drawer over the content — close it on pick.
    if (typeof window !== 'undefined' && window.innerWidth < 768) onHide();
  };

  const className = [
    'app-sidebar',
    !isVisible && 'app-sidebar--hidden',
    isCollapsed && 'app-sidebar--collapsed',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <aside className={className} aria-hidden={!isVisible}>
      <div className="app-sidebar__head">
        {isCollapsed ? (
          <button
            type="button"
            className="app-sidebar__expand"
            onClick={onToggleCollapse}
            aria-label="Expand sidebar"
            title="Expand sidebar"
          >
            <BrandLogo layout="mark" size={30} />
            <span className="app-sidebar__expand-icon" aria-hidden="true">
              <ArrowRightFromLine size={16} strokeWidth={1.5} />
            </span>
          </button>
        ) : (
          <>
            <Link to="/" className="app-sidebar__brand">
              <BrandLogo layout="horizontal" size={32} title="Recruitment Gorilla" />
            </Link>
            <button
              type="button"
              className="app-sidebar__icon-btn hidden md:inline-grid"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="app-sidebar__icon-btn inline-grid md:hidden"
              onClick={onHide}
              aria-label="Close navigation"
              title="Close navigation"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </>
        )}
      </div>

      <nav className="app-sidebar__nav" aria-label="Primary">
        {routes.map((route) => {
          // NavLink appends the `active` class itself; isRouteActive is only
          // used to decide whether a click is a real navigation worth spinning.
          const Icon = pendingPath === route.path ? LoaderCircle : route.icon;
          return (
            <NavLink
              key={route.path}
              to={route.path}
              end={route.path === '/'}
              className="nav-item-link"
              title={route.label}
              onClick={() => handleNavClick(route.path)}
            >
              <Icon
                size={16}
                strokeWidth={1.5}
                aria-hidden="true"
                className={pendingPath === route.path ? 'anim-spin' : undefined}
              />
              {!isCollapsed && route.label}
            </NavLink>
          );
        })}
      </nav>
    </aside>
  );
}
