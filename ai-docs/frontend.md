# Frontend

React 19 + TypeScript + Vite. Root: `client/`.

## Structure
| Path | Purpose |
|---|---|
| `src/main.tsx` | Entry; wraps app in `QueryClientProvider`; imports Bootstrap CSS + `index.css`. |
| `src/App.tsx` | Router, `AuthProvider`, `ProtectedLayout` (navbar + guard), routes. |
| `src/auth/AuthContext.tsx` | Auth state, login/logout, silent session restore. |
| `src/services/api.ts` | Typed Axios layer + auth interceptors (the only HTTP caller). |
| `src/types/index.ts` | Shared types mirroring API DTOs. |
| `src/pages/` | `LoginPage`, `UploadPage`, `CandidatesPage`, `CandidateDetailPage`. |
| `src/components/` | `BulkUploader`, `CandidateForm`, `StatusTimeline`. |
| `src/index.css` | Microsoft Fluent theme (CSS variables). |
| `public/logo.png` | Brand logo. |
| `vite.config.ts` | Dev server host + `/api` proxy. |

## Routing & layout (`App.tsx`)
- `/login` → `LoginPage` (public).
- All other routes are children of `ProtectedLayout`, which:
  - shows a spinner while `loading` (initial silent refresh in flight),
  - redirects to `/login` (preserving `from`) when not authenticated,
  - otherwise renders the **app bar** (logo, nav links with Fluent pivot underline, username + Sign out) and `<Outlet />`.
- Routes: `/` & `/candidates` → `CandidatesPage`, `/upload` → `UploadPage`, `/candidates/:id` → `CandidateDetailPage`.

## Data fetching (TanStack Query)
- Reads: `useQuery` with array keys — `['candidates', { search, status, page }]`, `['candidate', id]`, `['status-options']`, `['status-options', 'initial']`, `['status-options', 'next', id]`. Use `keepPreviousData` for paged lists.
- Writes: `useMutation`; on success invalidate keys — e.g. after create/delete/status change, `invalidateQueries({ queryKey: ['candidates'] })` and/or `['candidate', id]`.
- All calls go through `services/api.ts` functions; never call Axios in a component.

## `services/api.ts`
- Axios instance: `baseURL = '/api'` (same-origin → Vite proxies to backend), `withCredentials: true`.
- **Auth interceptors**: attach in-memory access token on requests; on 401, do a single silent `/auth/refresh` and replay the request, else redirect to `/login`. See [auth.md](auth.md).
- One exported, typed function per endpoint: `uploadCV`, `getCandidates`, `getCandidate`, `getCandidateRoles`, `getStatusOptions`, `getInitialStatusOptions`, `getNextStatusOptions`, `createCandidate`, `updateCandidate`, `addStatus`, `deleteCandidate`, `downloadCvFile`, `login`, `logout`, `refreshSession`.
- **Authenticated file download**: `downloadCvFile` fetches the CV as a blob (so the bearer token is sent) and triggers a browser save — a plain `<a href>` can't carry the token.

## Key flows
- **Upload** (`UploadPage` + `BulkUploader` + `CandidateForm`): drop multiple PDFs/`.docx` → each posts to `/cvupload` → drafts queue → review/edit in `CandidateForm` with database-backed initial-status dropdown → `createCandidate`. Reject/Discontinued require an initial-status comment. Handles the duplicate-email 409 ("save anyway / open existing").
- **List** (`CandidatesPage`): paged table, search by name/email, database-backed status filter, per-row delete (confirm modal). Responsive: columns hide progressively on small screens (email shown under the name on mobile).
- **Detail** (`CandidateDetailPage`): editable profile, database-backed add-status dropdown that only shows valid next statuses, dynamic prerequisite fields, `StatusTimeline` (newest on top), CV download links, delete (confirm modal).

Both the upload `CandidateForm` and the detail `ProfileEditor` include **GitHub URL**, **Portfolio website**, a **Role applied for** searchable dropdown (`<input list>` + `<datalist>` fed by `['candidate-roles']`), and a **"This candidate has been referred"** checkbox that reveals Reference name\* / Reference email\* / Employee ID (name+email required when checked, mirrored server-side). Invalidate `['candidate-roles']` after create/update so new roles appear in suggestions.

## Theme (`index.css`)
- Microsoft Fluent: primary `#0078d4`, neutral surfaces, depth shadows, Segoe UI. Defined as `--ms-*` variables and mapped onto Bootstrap's `--bs-*` (including `--bs-btn-*` for buttons, which Bootstrap 5.3 reads).
- Custom classes: `.app-navbar`, `.app-logo-img`, `.login-shell`/`.login-card`, status badge tint, modal elevation.
- **Don't hardcode colors** in components — rely on Bootstrap classes/variants which inherit the theme.

## Build / typecheck
```bash
cd client
npm run dev          # dev server (proxy + LAN host)
npx tsc -b           # typecheck (run after edits)
npm run build        # tsc -b && vite build
```
The `.docx`/PDF flows and auth need the backend running; see [dev-setup.md](dev-setup.md).
