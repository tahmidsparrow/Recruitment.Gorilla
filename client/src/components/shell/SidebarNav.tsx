import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRightFromLine,
  LoaderCircle,
  LogOut,
  PanelLeftClose,
  X,
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { isRouteActive, visibleRoutes } from '../../navRoutes';
import { initialsOf } from '../../utils/initials';
import ThemeToggle from '../ThemeToggle';

type SidebarNavProps = {
  isVisible: boolean;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onHide: () => void;
};

/**
 * The primary navigation. Three zones, matching Prism's SidebarNav: brand +
 * collapse control, the route list, then the theme toggle and the signed-in
 * user's card.
 */
export default function SidebarNav({
  isVisible,
  isCollapsed,
  onToggleCollapse,
  onHide,
}: SidebarNavProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const routes = visibleRoutes(user?.roles ?? []);

  // Clear the pending spinner once the route has actually changed.
  useEffect(() => {
    setPendingPath(null);
  }, [location.pathname]);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

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

  const displayName = user?.name ?? user?.email ?? '';

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
            <img src="/logo.png" alt="" className="app-logo-img" />
            <span className="app-sidebar__expand-icon" aria-hidden="true">
              <ArrowRightFromLine size={16} strokeWidth={1.5} />
            </span>
          </button>
        ) : (
          <>
            <Link to="/" className="app-sidebar__brand">
              <img src="/logo.png" alt="Recruitment Gorilla" className="app-logo-img" />
            </Link>
            <button
              type="button"
              className="app-sidebar__icon-btn d-none d-md-inline-grid"
              onClick={onToggleCollapse}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <PanelLeftClose size={16} strokeWidth={1.5} />
            </button>
            <button
              type="button"
              className="app-sidebar__icon-btn d-inline-grid d-md-none"
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

      <div className="app-sidebar__foot">
        <div className="app-sidebar__divider" />

        <ThemeToggle variant="sidebar" collapsed={isCollapsed} />

        {user && (
          <div
            className="user-card"
            title={isCollapsed ? `${displayName} · ${user.email}` : undefined}
          >
            <span className="user-card__avatar-wrap">
              <span className="user-card__avatar" aria-hidden="true">
                {initialsOf(user.name, user.email)}
              </span>
              <span className="user-card__presence" aria-hidden="true" />
            </span>

            {!isCollapsed && (
              <>
                <span className="user-card__details">
                  {/* Kept as a link to /change-password — the navbar username
                      did the same thing before the shell change. */}
                  <Link to="/change-password" className="user-card__name" title={displayName}>
                    {displayName}
                  </Link>
                  <span className="user-card__email" title={user.email}>
                    {user.email}
                  </span>
                </span>
                <button
                  type="button"
                  className="user-card__logout"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  aria-label={loggingOut ? 'Signing out…' : 'Sign out'}
                  title={loggingOut ? 'Signing out…' : 'Sign out'}
                >
                  {loggingOut ? (
                    <LoaderCircle size={14} strokeWidth={1.5} aria-hidden="true" className="anim-spin" />
                  ) : (
                    <LogOut size={14} strokeWidth={1.5} aria-hidden="true" />
                  )}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
