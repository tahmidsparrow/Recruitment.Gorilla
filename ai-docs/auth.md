# Authentication

Single hardcoded admin (default **admin / admin**). JWT access tokens + rotating refresh tokens. Backend is the real gate (not just the UI), because the API is reachable through the Vite proxy.

## Token model
- **Access token** — short-lived JWT (default 15 min, `Jwt:AccessTokenMinutes`), HS256, returned in the login/refresh response **body**. The client keeps it **in memory only** (not localStorage) to limit XSS exposure.
- **Refresh token** — opaque random value (32 bytes), delivered in an **httpOnly, SameSite=Strict cookie** named `rg_refresh`, **path `/api/auth`**. Server stores only its **SHA-256 hash** (`RefreshToken` entity). Default lifetime 7 days (`Jwt:RefreshTokenDays`).
  - `Secure` is **off in Development** (dev is HTTP) and **on otherwise** — set automatically from `IWebHostEnvironment.IsDevelopment()`.

## Server pieces
- `Services/AuthService.cs` — credential verification (PBKDF2), access-token creation, refresh-token issue/rotate/revoke. Token hashing is SHA-256; password verification is constant-time.
- `Controllers/AuthController.cs` — `[AllowAnonymous]`:
  - `POST /api/auth/login` — verify creds → set refresh cookie → return `AuthResultDto { token, username, expiresAt }`.
  - `POST /api/auth/refresh` — read cookie → validate + **rotate** (revoke old, issue new) → set new cookie → return new access token.
  - `POST /api/auth/logout` — revoke refresh token server-side + clear cookie → `204`.
- `Models/RefreshToken.cs` — see [data-model.md](data-model.md). Rotation records `ReplacedByTokenHash`.

## Credentials (hashed)
- `Auth:Username` is non-secret (in `appsettings.json`, default `admin`).
- `Auth:PasswordHash` is a **PBKDF2-HMAC-SHA256** hash in **user secrets**, format `iterations.saltBase64.hashBase64` (100k iterations, 16-byte salt, 32-byte key). No plaintext password anywhere.
- To (re)generate the hash for a password, see [dev-setup.md](dev-setup.md).

## Validation hardening (`Program.cs`)
- `Jwt:Key` from user secrets; startup throws if missing or < 32 bytes.
- `TokenValidationParameters`: validate issuer/audience/lifetime/signing-key; `RequireSignedTokens`, `RequireExpirationTime`; **`ValidAlgorithms = [HS256]`** (prevents alg-confusion); `ClockSkew = Zero`; `MapInboundClaims = false`; `NameClaimType = sub`, `RoleClaimType = role`.
- **Default-deny**: `FallbackPolicy = RequireAuthenticatedUser()` — every endpoint needs auth unless `[AllowAnonymous]`.

## Frontend (`services/api.ts` + `auth/AuthContext.tsx`)
- Axios `withCredentials: true` so the refresh cookie rides along on `/auth/*`.
- Request interceptor attaches the in-memory access token.
- Response interceptor: on **401**, run a **single-flight** `/auth/refresh`; if it returns a token, retry the original request; otherwise redirect to `/login`. (Auth endpoints are excluded to avoid loops; `_retry` flag prevents repeats.)
- `AuthProvider` calls `refreshSession()` once on load to restore a session from the cookie (shows a spinner via `loading` until it resolves). `isAuthenticated` is derived from having a username.

## How to PROTECT a new endpoint
Nothing extra needed in most cases — the **default-deny fallback** already requires auth. Just don't add `[AllowAnonymous]`. For clarity, data controllers also carry an explicit `[Authorize]` (e.g. `CandidatesController`). Only auth/login-style endpoints should be `[AllowAnonymous]`.

## How to CALL a protected API from the client
Add a typed function in `services/api.ts` using the shared `api` instance — the interceptors handle the token and refresh automatically:
```ts
export const archiveCandidate = async (id: number): Promise<void> => {
  await api.post(`/candidates/${id}/archive`);
};
```
For file downloads, fetch a blob through `api` (like `downloadCvFile`) rather than using a raw `<a href>`, so the token is sent.

## Production notes
- Enable **HTTPS** — the refresh cookie's `Secure` flag turns on outside Development automatically.
- Move `Jwt:Key` and `Auth:PasswordHash` to environment variables / a secret store.
- Real multi-user accounts (vs. the single configured admin) would mean a users table with per-user hashes and roles — a later phase.
