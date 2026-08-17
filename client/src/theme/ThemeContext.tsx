import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

/** What the user picked. `system` defers to the OS and keeps following it. */
export type ThemePreference = 'light' | 'dark' | 'system';
/** What is actually painted — `system` resolved against the OS. */
export type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  /** The user's choice, including `system`. Drives the menu's checked state. */
  preference: ThemePreference;
  /** The resolved theme. This is what components (charts) should read. */
  theme: ResolvedTheme;
  setPreference: (p: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const STORAGE_KEY = 'rg-theme';
const darkQuery = () => window.matchMedia('(prefers-color-scheme: dark)');

/**
 * The stored value is the *preference*, not the resolved theme. It used to be
 * the resolved one, which made "follow the OS" unrepresentable: once anything
 * was saved the app was pinned to it forever. Existing 'light'/'dark' values
 * are still valid preferences, so nothing needs migrating.
 */
function initialPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'light' || saved === 'dark' || saved === 'system') return saved;
  } catch {
    // Storage can throw in private mode; fall through to the default.
  }
  return 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(initialPreference);
  const [systemTheme, setSystemTheme] = useState<ResolvedTheme>(() =>
    darkQuery().matches ? 'dark' : 'light',
  );

  // Keep following the OS while the preference is `system` — the whole point
  // of the option is that it tracks a change made after the page loaded.
  useEffect(() => {
    const mq = darkQuery();
    const onChange = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? 'dark' : 'light');
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const theme: ResolvedTheme = preference === 'system' ? systemTheme : preference;

  useEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme);
  }, [theme]);

  const setPreference = useCallback((p: ThemePreference) => {
    setPreferenceState(p);
    try {
      localStorage.setItem(STORAGE_KEY, p);
    } catch {
      // ignore storage failures (private mode etc.)
    }
  }, []);

  return (
    <ThemeContext.Provider value={{ preference, theme, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
