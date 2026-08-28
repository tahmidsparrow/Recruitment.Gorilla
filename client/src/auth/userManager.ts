import { UserManager } from 'oidc-client-ts';

// The one OIDC session for this app — imported by AuthContext (React state binding)
// and services/api.ts (reading the current access token for requests), so there is
// exactly one source of truth for the session rather than two independently-configured
// clients that could drift.
//
// redirect_uri is base-aware the same way services/api.ts's baseURL and App.tsx's
// router basename already are: import.meta.env.BASE_URL yields "/" locally, "/ats/"
// in the container build.
export const userManager = new UserManager({
  authority: import.meta.env.VITE_IAM_AUTHORITY,
  client_id: 'ats',
  redirect_uri: `${window.location.origin}${import.meta.env.BASE_URL}callback`,
  response_type: 'code',
  scope: 'openid email profile offline_access',
  // offline_access above means oidc-client-ts prefers refresh_token-based renewal over
  // iframe-based silent renew automatically once a refresh token is present.
  automaticSilentRenew: true,
  // Gorilla.IAM has no /connect/userinfo handler yet (only /connect/authorize and
  // /connect/token exist — same class of gap Increment 1 found and closed for those
  // two; this one is being deliberately left for a later increment). Not needed here
  // either way: email/name/roles already ride the id_token/access_token (spec 3.2).
  // false is also this library's own default — set explicitly so the reason is on
  // record, not just inherited silently.
  loadUserInfo: false,
});

/**
 * The namespaced "ats_roles" claim (spec 3.2) rides only on the access token, never
 * the id_token — OidcEndpoints.cs's SetDestinations in Gorilla.IAM sends sub/email/name
 * to both, but every "{app}_roles" claim to the access token only. oidc-client-ts's
 * `user.profile` is id_token-derived, so it never has this; the access token's payload
 * has to be decoded directly to read roles.
 */
export function readAtsRoles(accessToken: string): string[] {
  try {
    const payload = accessToken.split('.')[1];
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(json) as Record<string, unknown>;
    const roles = claims.ats_roles;
    // A JWT claim with exactly one value serializes as a bare string, not a one-element
    // array — confirmed against a real IAM token for a single-role subject
    // ("ats_roles": "Admin", not ["Admin"]). Only two or more roles produce an array.
    if (typeof roles === 'string') return [roles];
    return Array.isArray(roles) ? roles.filter((r): r is string => typeof r === 'string') : [];
  } catch {
    return [];
  }
}
