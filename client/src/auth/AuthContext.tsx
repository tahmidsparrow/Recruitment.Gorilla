import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User as OidcUser } from 'oidc-client-ts';
import { userManager, readAtsRoles } from './userManager';
import type { AuthUser, Role } from '../types';

interface AuthContextValue {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  /** Redirects to Gorilla.IAM to sign in; never resolves (full-page navigation).
   *  `from` is round-tripped through oidc-client-ts's own state param and recovered
   *  on /callback. */
  login: (from?: string) => Promise<void>;
  logout: () => Promise<void>;
  /** Re-sync auth state from the current OIDC session (e.g. after a silent renewal
   *  the app wants reflected immediately, or from ChangePasswordPage's local-login
   *  path — see that file for why it still exists). */
  refresh: () => Promise<void>;
  hasRole: (role: Role) => boolean;
  hasAnyRole: (...roles: Role[]) => boolean;
  isSuperAdmin: boolean;
  isAdminOrAbove: boolean;
  canWriteCandidates: boolean;
  /** Bottom of the hierarchy: holds no SuperAdmin/Admin/Recruiter role (dashboard + assigned interviews only). */
  isInterviewerOnly: boolean;
  mustChangePassword: boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function toAuthUser(oidcUser: OidcUser): AuthUser {
  return {
    name: oidcUser.profile.name ?? oidcUser.profile.email ?? '',
    email: oidcUser.profile.email ?? '',
    roles: readAtsRoles(oidcUser.access_token) as Role[],
    // Gorilla.IAM never issues a token until a pending password change is resolved
    // (spec 3.2) — there is no equivalent claim to read on an IAM-issued token.
    mustChangePassword: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On first load, try to restore a session oidc-client-ts already has (its own
  // storage, not ours — replaces the httpOnly-cookie-restore dance this used to do).
  useEffect(() => {
    let mounted = true;

    userManager.getUser().then((oidcUser) => {
      if (!mounted) return;
      setUser(oidcUser && !oidcUser.expired ? toAuthUser(oidcUser) : null);
      setLoading(false);
    });

    // Keeps React state in sync with automaticSilentRenew's background refresh-token
    // renewal, and with the callback page's signinRedirectCallback() call.
    const unsubscribeLoaded = userManager.events.addUserLoaded((oidcUser) => {
      if (mounted) setUser(toAuthUser(oidcUser));
    });
    const unsubscribeUnloaded = userManager.events.addUserUnloaded(() => {
      if (mounted) setUser(null);
    });

    return () => {
      mounted = false;
      unsubscribeLoaded();
      unsubscribeUnloaded();
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
      login: (from) => userManager.signinRedirect({ state: { from } }),
      logout: async () => {
        // Local-only session clear: Gorilla.IAM has no /connect/logout (end-session)
        // handler yet — same deliberately-deferred gap as /connect/userinfo (see
        // userManager.ts). This does not end the IAM session cookie itself, so it is
        // not yet true cross-app SSO logout (spec 3.5) — a later increment's job.
        await userManager.removeUser();
      },
      refresh: async () => {
        const oidcUser = await userManager.getUser();
        setUser(oidcUser && !oidcUser.expired ? toAuthUser(oidcUser) : null);
      },
      hasRole,
      hasAnyRole,
      isSuperAdmin: hasRole('SuperAdmin'),
      isAdminOrAbove: hasAnyRole('SuperAdmin', 'Admin'),
      canWriteCandidates: hasAnyRole('SuperAdmin', 'Admin', 'Recruiter'),
      isInterviewerOnly: user !== null && !hasAnyRole('SuperAdmin', 'Admin', 'Recruiter'),
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
