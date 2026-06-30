import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { login as apiLogin, logout as apiLogout, refreshSession } from '../services/api';
import type { AuthUser, LoginPayload, LoginResult, Role } from '../types';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  login: (payload: LoginPayload) => Promise<AuthUser>;
  logout: () => Promise<void>;
  /** Re-sync auth state from the latest token (e.g. after changing password). */
  refresh: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (...roles: Role[]) => boolean;
  isSuperAdmin: boolean;
  isAdminOrAbove: boolean;
  canWriteCandidates: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toUser(res: LoginResult): AuthUser {
  return {
    name: res.name,
    email: res.email,
    roles: res.roles,
    mustChangePassword: res.mustChangePassword,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore a session from the httpOnly refresh cookie.
  useEffect(() => {
    let mounted = true;
    refreshSession()
      .then((res) => {
        if (mounted && res) setUser(toUser(res));
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => {
    const roles = user?.roles ?? [];
    const hasRole = (role: Role) => roles.includes(role);
    const hasAnyRole = (...want: Role[]) => want.some((r) => roles.includes(r));
    return {
      isAuthenticated: user !== null,
      user,
      loading,
      login: async (payload) => {
        const res = await apiLogin(payload);
        const u = toUser(res);
        setUser(u);
        return u;
      },
      logout: async () => {
        await apiLogout();
        setUser(null);
      },
      refresh: async () => {
        const res = await refreshSession();
        setUser(res ? toUser(res) : null);
      },
      hasRole,
      hasAnyRole,
      isSuperAdmin: hasRole('SuperAdmin'),
      isAdminOrAbove: hasAnyRole('SuperAdmin', 'Admin'),
      canWriteCandidates: hasAnyRole('SuperAdmin', 'Admin', 'Recruiter'),
      mustChangePassword: user?.mustChangePassword ?? false,
    };
  }, [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
