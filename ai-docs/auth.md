# Authentication & Authorization

Multi-user, role-based accounts stored in the database. **Login is by email.** JWT access tokens + rotating refresh tokens. The backend is the real gate (not just the UI), because the API is reachable through the Vite proxy.

## Roles & permission matrix
Four roles in a strict hierarchy **SuperAdmin → Admin → Recruiter → Interviewer**; a user may hold **several** at once (`UserRole` rows, one per role). A higher role can do everything a lower one can (each policy allow-list in `Auth/Roles.cs` includes the roles above it). Constants live in `Auth/Roles.cs` (`Roles.AdminOrAbove`, `Roles.CanWriteCandidate`, `Roles.SuperAdmin`) — use them instead of string literals.

| Capability | SuperAdmin | Admin | Recruiter | Interviewer |
|---|---|---|---|---|
| Manage users & assign roles (`/api/users`) | ✅ | – | – | – |
| Configuration: roles/skills (`/api/config/*`) | ✅ | ✅ | – | – |
| **Delete** a job-opening role | ✅ | – | – | – |
| View / browse candidates | all | all | **own only** | – |
| Create / upload candidate | ✅ | ✅ | ✅ (becomes owner) | – |
| Edit / change status / delete candidate | ✅ (all) | ✅ (all) | **own only** | – |
| Dashboard + assigned interviews + evaluations | ✅ | ✅ | ✅ | ✅ |

- **Recruiter scoping**: `CandidatesController` derives a read/write owner scope from `CurrentUser`. Recruiters only see/edit candidates whose `Candidate.OwnerUserId` is their user id; Admin+ pass `null` (no filter). New candidates a Recruiter creates are stamped with their id as owner. Legacy rows have `OwnerUserId = NULL` → visible to Admin+ only.
- **Interviewer** (bottom of the hierarchy; the former "Viewer", renamed) can **only** reach the dashboard, their assigned interviews (`/api/interviews/*`, `/api/notifications/*`), and evaluations. Candidate list/detail GETs are gated by `[Authorize(Roles = Roles.CanWriteCandidate)]`, and the UI hides those menu items/routes. They still see a candidate's read-only snapshot + CV **through** an interview they're assigned to.
- **Job-opening delete is SuperAdmin-only** (`[Authorize(Roles = Roles.SuperAdmin)]` on `DELETE /api/config/roles/{id}`); a role with candidates is soft-disabled and the response reports the count.
- **Config management is Admin+**, but the candidate create/edit forms need active Role/Skill lookups; those are exposed to **CanWriteCandidate** via `GET /api/candidates/role-options` · `/skill-options` so **Recruiters** aren't blocked by the Admin-only `/config/*` endpoints.
- **End-date lock**: once a `RoleAppliedOption.EndDate` passes, `CandidateService` blocks profile updates and status changes for that role's candidates (all roles, incl. Admin) until an Admin extends the End Date.

## Token model
- **Access token** — short-lived JWT (default 15 min, `Jwt:AccessTokenMinutes`), HS256, returned in the login/refresh response **body**. The client keeps it **in memory only** (not localStorage) to limit XSS exposure.
- **Refresh token** — opaque random value (32 bytes), delivered in an **httpOnly, SameSite=Strict cookie** named `rg_refresh`, **path `/api/auth`**. Server stores only its **SHA-256 hash** (`RefreshToken` entity). Default lifetime 7 days (`Jwt:RefreshTokenDays`).
  - `Secure` is **off in Development** (dev is HTTP) and **on otherwise** — set automatically from `IWebHostEnvironment.IsDevelopment()`.

## Claims
Built in `AuthService.CreateAccessToken(User)`:
- `sub` = user id (the `NameClaimType`).
- `ClaimTypes.Name` = display name, `ClaimTypes.Email` = email.
- one `ClaimTypes.Role` claim **per assigned role** (the `RoleClaimType`).
- `must_change_password = true` when the user has a pending temporary password.

`Services/CurrentUser.cs` (scoped, reads `HttpContext.User`) exposes `UserId`, `Name`, `Email`, `Roles`, `IsInRole`, `IsInAnyRole` to controllers.

## Server pieces
- `Models/User.cs` / `Models/UserRole.cs` — see [data-model.md](data-model.md). `User` has `Email` (unique), `PasswordHash`, `MustChangePassword`, `IsActive`, `CreatedByUserId`, `LastLoginAt`.
- `Services/AuthService.cs` — DB-backed credential verification (PBKDF2), access-token creation, refresh issue/rotate/revoke, and `ChangePasswordAsync`. On **refresh** the user is re-loaded: deactivated users are rejected (token revoked) and claims are rebuilt from current roles, so role changes / deactivation take effect on the next refresh without re-login.
- `Auth/PasswordHasher.cs` — `Hash(password)` → `iterations.saltB64.hashB64` (100k iterations, SHA-256) and `Verify`. Used for seeding, admin-set temp passwords, and self-service change.
- `Services/UserService.cs` — list/create/update/reset-password with validation (unique email, ≥1 valid role) and a guard preventing the **last active SuperAdmin** from being deactivated or stripped of the role.
- `Controllers/AuthController.cs` — `[AllowAnonymous]` only on `login`/`refresh`/`logout`:
  - `POST /api/auth/login` — `{ email, password }` → verify → set refresh cookie → return `AuthResultDto { token, name, email, roles[], mustChangePassword, expiresAt }`.
  - `POST /api/auth/refresh` — rotate refresh token → return new access token + the same richer result.
  - `POST /api/auth/logout` — revoke + clear cookie → `204`.
  - `POST /api/auth/change-password` — `[Authorize]` (allowed through the password-change guard) → verify current, set new hash, clear `MustChangePassword`.
- `Controllers/UsersController.cs` — `[Authorize(Roles = Roles.SuperAdmin)]`: list / create / update / reset-password.
- `Controllers/ConfigurationController.cs` — `[Authorize(Roles = Roles.AdminOrAbove)]`.
- `Controllers/CVUploadController.cs` — `[Authorize(Roles = Roles.CanWriteCandidate)]`.

## First-login password change
- Accounts created by a SuperAdmin (and any admin password reset) set `MustChangePassword = true`.
- `Authorization/PasswordChangedRequirement.cs` + handler are added to the `FallbackPolicy`. When the `must_change_password` claim is present, **every** request is denied **except** the allow-list (`/api/auth/change-password`), so a first-login user can only change their password until they do.
- The frontend mirrors this: `ProtectedLayout` redirects to `/change-password` while `mustChangePassword` is set.

## Seeding the first SuperAdmin
On startup (`Program.cs`, after `Migrate()`): if **no users exist**, seed a SuperAdmin from config — `Auth:SeedAdminEmail` (default `admin@recruitmentgorilla.com`), `Auth:SeedAdminName` (default `Super Admin`), and the existing `Auth:PasswordHash` (user secrets) — with `MustChangePassword = false`. This preserves the original admin password while moving identity into the DB. **Log in with that email + the existing admin password.**

## Credentials (hashed)
- `Auth:PasswordHash` is a **PBKDF2-HMAC-SHA256** hash in **user secrets**, format `iterations.saltBase64.hashBase64` (100k iterations, 16-byte salt, 32-byte key). It only seeds the first SuperAdmin; thereafter every user has their own `PasswordHash` row.
- To (re)generate a hash, see [dev-setup.md](dev-setup.md).

## Validation hardening (`Program.cs`)
- `Jwt:Key` from user secrets; startup throws if missing or < 32 bytes.
- `TokenValidationParameters`: validate issuer/audience/lifetime/signing-key; `RequireSignedTokens`, `RequireExpirationTime`; **`ValidAlgorithms = [HS256]`** (prevents alg-confusion); `ClockSkew = Zero`; `MapInboundClaims = false`; `NameClaimType = sub`, `RoleClaimType = role`.
- **Default-deny**: `FallbackPolicy = RequireAuthenticatedUser()` + `PasswordChangedRequirement` — every endpoint needs auth (and a changed password) unless `[AllowAnonymous]`.

## Frontend (`services/api.ts` + `auth/AuthContext.tsx`)
- Axios `withCredentials: true` so the refresh cookie rides along on `/auth/*`.
- Request interceptor attaches the in-memory access token; response interceptor runs a **single-flight** `/auth/refresh` on 401 and retries, else redirects to `/login`.
- `AuthProvider` stores the full `AuthUser { name, email, roles, mustChangePassword }` from the login/refresh response (no JWT decode needed). It exposes `hasRole`, `hasAnyRole`, `isSuperAdmin`, `isAdminOrAbove`, `canWriteCandidates`, `mustChangePassword`, and `refresh()` (re-sync after changing password).
- `components/RequireRole.tsx` guards routes (redirects to `/candidates` when the role is missing). Nav links and candidate write controls are gated by the same flags.

## How to PROTECT a new endpoint
The default-deny fallback already requires auth. To restrict by role, add `[Authorize(Roles = Roles.AdminOrAbove)]` (or another constant) on the controller/action. Only auth/login-style endpoints should be `[AllowAnonymous]`.

## How to CALL a protected API from the client
Add a typed function in `services/api.ts` using the shared `api` instance — the interceptors handle the token and refresh automatically:
```ts
export const archiveCandidate = async (id: number): Promise<void> => {
  await api.post(`/candidates/${id}/archive`);
};
```
For file downloads, fetch a blob through `api` (like `downloadCvFile`) rather than a raw `<a href>`, so the token is sent.

## Production notes
- Enable **HTTPS** — the refresh cookie's `Secure` flag turns on outside Development automatically.
- Move `Jwt:Key` and `Auth:PasswordHash` to environment variables / a secret store.
