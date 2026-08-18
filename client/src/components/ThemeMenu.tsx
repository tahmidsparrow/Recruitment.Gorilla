import { useState } from 'react';
import { Dropdown } from 'react-bootstrap';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { useTheme, type ThemePreference } from '../theme/ThemeContext';

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

/**
 * Theme picker: Light / Dark / System.
 *
 * A menu rather than the sun-moon toggle this replaces, because a two-state
 * toggle cannot express "follow the OS" — and the stored value used to be the
 * *resolved* theme, so the moment you touched the toggle you were pinned to a
 * fixed mode forever with no way back to automatic.
 *
 * The trigger shows the icon of what is currently *painted* (so it reads as a
 * status), while the tick marks the chosen preference — which is `System` even
 * when that currently resolves to dark.
 */
export default function ThemeMenu({ className = '' }: { className?: string }) {
  const { preference, theme, setPreference } = useTheme();
  // Controlled: react-bootstrap only auto-closes on <Dropdown.Item>, so plain
  // buttons in the panel would leave the menu hanging open after a choice.
  const [open, setOpen] = useState(false);
  const TriggerIcon = theme === 'dark' ? Moon : Sun;
  const current = OPTIONS.find((o) => o.value === preference);

  return (
    <Dropdown align="end" className={className} show={open} onToggle={setOpen}>
      <Dropdown.Toggle
        as="button"
        className="btn btn-outline-secondary btn-sm topbar-btn"
        aria-label={`Theme: ${current?.label ?? 'System'}`}
        title={`Theme: ${current?.label ?? 'System'}`}
      >
        <TriggerIcon size={16} strokeWidth={1.75} aria-hidden="true" />
      </Dropdown.Toggle>

      <Dropdown.Menu className="menu-panel">
        <div className="menu-panel__label">Appearance</div>
        {OPTIONS.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            className={`menu-item${preference === value ? ' menu-item--active' : ''}`}
            onClick={() => {
              setPreference(value);
              setOpen(false);
            }}
            aria-pressed={preference === value}
          >
            <Icon size={15} strokeWidth={1.75} aria-hidden="true" />
            <span className="menu-item__label">{label}</span>
            {preference === value && (
              <Check size={15} strokeWidth={2.25} aria-hidden="true" className="menu-item__check" />
            )}
          </button>
        ))}
      </Dropdown.Menu>
    </Dropdown>
  );
}
