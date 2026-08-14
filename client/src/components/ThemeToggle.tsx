import { Button } from 'react-bootstrap';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';

type ThemeToggleProps = {
  className?: string;
  /**
   * `button` is the standalone control used on the login card. `sidebar` is the
   * full-width row in the shell's footer, which collapses to an icon.
   */
  variant?: 'button' | 'sidebar';
  collapsed?: boolean;
};

/** Sun/moon control that toggles light/dark mode. */
export default function ThemeToggle({
  className = '',
  variant = 'button',
  collapsed = false,
}: ThemeToggleProps) {
  const { theme, toggle } = useTheme();
  const isDark = theme === 'dark';
  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode';
  const Icon = isDark ? Sun : Moon;

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        className={`nav-item-link w-100 ${className}`.trim()}
        onClick={toggle}
        aria-label={label}
        title={label}
      >
        <Icon size={16} strokeWidth={1.5} aria-hidden="true" />
        {!collapsed && (isDark ? 'Light mode' : 'Dark mode')}
      </button>
    );
  }

  return (
    <Button
      variant="outline-secondary"
      size="sm"
      className={`d-inline-flex align-items-center justify-content-center ${className}`.trim()}
      onClick={toggle}
      aria-label={label}
      title={label}
      style={{ width: 34, height: 34, minHeight: 34, padding: 0 }}
    >
      <Icon size={16} strokeWidth={1.75} aria-hidden="true" />
    </Button>
  );
}
