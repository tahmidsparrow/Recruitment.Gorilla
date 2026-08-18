import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Dropdown } from 'react-bootstrap';
import { KeyRound, LoaderCircle, LogOut } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { initialsOf } from '../../utils/initials';

/**
 * The signed-in user's avatar in the topbar, expanding to their account menu.
 *
 * This replaces the user card that sat in the sidebar footer. Two reasons it
 * moved: the card was one of the first things the eye hit on a collapsed
 * 64px rail yet held no navigation, and account controls belong with the other
 * chrome (notifications, theme) rather than at the foot of the nav list.
 */
export default function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  // Controlled: react-bootstrap only auto-closes on <Dropdown.Item>, so the
  // plain link/button below would leave the menu open after being used.
  const [open, setOpen] = useState(false);

  if (!user) return null;

  const displayName = user.name ?? user.email ?? '';

  const handleLogout = async () => {
    if (loggingOut) return;
    setOpen(false);
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      navigate('/login', { replace: true });
    }
  };

  return (
    <Dropdown align="end" show={open} onToggle={setOpen}>
      <Dropdown.Toggle
        as="button"
        className="user-menu__trigger"
        aria-label={`Account: ${displayName}`}
        title={displayName}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initialsOf(user.name, user.email)}
        </span>
      </Dropdown.Toggle>

      <Dropdown.Menu className="menu-panel menu-panel--wide">
        <div className="menu-identity">
          <span className="user-menu__avatar user-menu__avatar--lg" aria-hidden="true">
            {initialsOf(user.name, user.email)}
          </span>
          <span className="menu-identity__text">
            <span className="menu-identity__name" title={displayName}>
              {displayName}
            </span>
            <span className="menu-identity__email" title={user.email}>
              {user.email}
            </span>
          </span>
        </div>

        {user.roles.length > 0 && (
          <div className="menu-identity__roles">
            {user.roles.map((r) => (
              <span key={r} className="badge-pill badge-outline">
                {r}
              </span>
            ))}
          </div>
        )}

        <div className="menu-panel__divider" />

        <Link to="/change-password" className="menu-item" onClick={() => setOpen(false)}>
          <KeyRound size={15} strokeWidth={1.75} aria-hidden="true" />
          <span className="menu-item__label">Change password</span>
        </Link>

        <button
          type="button"
          className="menu-item menu-item--danger"
          onClick={handleLogout}
          disabled={loggingOut}
        >
          {loggingOut ? (
            <LoaderCircle size={15} strokeWidth={1.75} aria-hidden="true" className="anim-spin" />
          ) : (
            <LogOut size={15} strokeWidth={1.75} aria-hidden="true" />
          )}
          <span className="menu-item__label">{loggingOut ? 'Signing out…' : 'Sign out'}</span>
        </button>
      </Dropdown.Menu>
    </Dropdown>
  );
}
