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
| `src/pages/` | `DashboardPage`, `LoginPage`, `UploadPage`, `CandidatesPage`, `CandidateDetailPage`, `InterviewPage`, `ConfigurationPage`, `UsersPage`, `ChangePasswordPage`. |
| `src/components/` | `BulkUploader`, `CandidateForm`, `StatusTimeline`, `SearchableSelect`, `StatusBadge`, `ThemeToggle`, `ToastStack`, `RequireRole`, `NotificationBell`, `ReadOnlyCandidateProfile`, `EvaluationForm`. |
| `src/components/dashboard/` | Dashboard widgets: `KpiCard`, `kpiIcons`, `PipelineFunnelChart`, `StatusDonutChart`, `TrendChart`, `CountBarChart`, `ActiveJobOpeningsTable`, `MyInterviewsCard`. |
| `src/utils/` | `statusColors.ts` (status → tone class); `chartColors.ts` (chart colors from status tokens + chrome per theme); `evaluationCriteria.ts` (interview-form catalog — keys match the backend); `skillColors.ts` (stable hash of a skill name → colorful badge class). |
| `src/index.css` | Microsoft Fluent theme (CSS variables). |
| `public/logo.png` | Brand logo. |
| `vite.config.ts` | Dev server host + `/api` proxy. |

## Routing & layout (`App.tsx`)
- `/login` → `LoginPage` (public).
- All other routes are children of `ProtectedLayout`, which:
  - shows a spinner while `loading` (initial silent refresh in flight),
  - redirects to `/login` (preserving `from`) when not authenticated,
  - otherwise renders the **app bar** (logo, nav links with Fluent pivot underline, username + Sign out) and `<Outlet />`.
- Routes: `/` → `DashboardPage` (landing), `/candidates` → `CandidatesPage`, `/upload` → `UploadPage`, `/candidates/:id` → `CandidateDetailPage`, `/interviews/:id` → `InterviewPage`, `/configuration` (Admin+), `/users` (SuperAdmin), `/change-password`. The **Dashboard** nav link (`to="/" end`) is first and visible to all roles; the dashboard is owner-scoped server-side. The navbar also hosts a **`NotificationBell`** (all roles).

## Data fetching (TanStack Query)
- Reads: `useQuery` with array keys — `['dashboard']`, `['candidates', { search, status, page }]`, `['candidate', id]`, `['status-options']`, `['status-options', 'initial']`, `['status-options', 'next', id]`, `['notifications']` (60s `refetchInterval`), `['my-interviews']`, `['assignable-users']`, `['interview', id]`. Use `keepPreviousData` for paged lists.
- Writes: `useMutation`; on success invalidate keys — e.g. after create/delete/status change, `invalidateQueries({ queryKey: ['candidates'] })` and/or `['candidate', id]`.
- All calls go through `services/api.ts` functions; never call Axios in a component.

## `services/api.ts`
- Axios instance: `baseURL = '/api'` (same-origin → Vite proxies to backend), `withCredentials: true`.
- **Auth interceptors**: attach in-memory access token on requests; on 401, do a single silent `/auth/refresh` and replay the request, else redirect to `/login`. See [auth.md](auth.md).
- One exported, typed function per endpoint: `getDashboard`, `uploadCV`, `getCandidates`, `getCandidate`, `getStatusOptions`, `getInitialStatusOptions`, `getNextStatusOptions`, `createCandidate`, `updateCandidate`, `addStatus`, `deleteCandidate`, `downloadCvFile`, `previewCvFile`, `getRoleOptions`/`createRoleOption`/`updateRoleOption`/`deleteRoleOption`, `getSkillOptions`/`createSkillOption`/`updateSkillOption`/`deleteSkillOption`, `getAssignableUsers`, `getMyInterviews`, `getInterview`, `saveEvaluation`, `getNotifications`/`markNotificationRead`/`markAllNotificationsRead`, `login`, `logout`, `refreshSession`. (`getCandidateRoles` from the prior free-text role feature remains but is unused by the forms.)
- **Authenticated file download**: `downloadCvFile` fetches the CV as a blob (so the bearer token is sent) and triggers a browser save — a plain `<a href>` can't carry the token.

## Key flows
- **Upload** (`UploadPage` + `BulkUploader` + `CandidateForm`): drop multiple PDFs/`.docx` → each posts to `/cvupload` → drafts queue → review/edit in `CandidateForm` with database-backed initial-status dropdown → `createCandidate`. Reject/Discontinued require an initial-status comment. Handles the duplicate-email 409 ("save anyway / open existing").
- **List** (`CandidatesPage`): paged table, search by name/email, database-backed status filter, per-row delete (confirm modal). Responsive: columns hide progressively on small screens (email shown under the name on mobile).
- **Detail** (`CandidateDetailPage`): editable profile, database-backed add-status dropdown that only shows valid next statuses, dynamic prerequisite fields, `StatusTimeline` (newest on top), CV download links, delete (confirm modal).

Both the upload `CandidateForm` and the detail `ProfileEditor` include **GitHub URL**, **Portfolio website**, a **Role applied for** single-select and a **Skills** multi-select (both `components/SearchableSelect.tsx`, fed by `['config','roles']` / `['config','skills']` — configured values only, **not creatable** from the candidate form), and a **"This candidate has been referred"** checkbox revealing Reference name\* / email\* / Employee ID. Forms validate required full name + email format client-side (mirrored server-side); the legacy free-text role datalist was replaced by the configured role select.

### Dashboard (`pages/DashboardPage.tsx`, route `/`)
Single `useQuery(['dashboard'])` → `getDashboard()`, rendered as react-bootstrap `Row`/`Col`/`Card` sections:
- **KPI cards** — six `components/dashboard/KpiCard`s ("Stage Performance" style: accent icon chip, big value, sub-label + %, thin progress bar). Tones/hover are CSS-token driven (`.kpi--<tone>` + `.kpi-card` in `index.css`, light + dark, `prefers-reduced-motion`-aware); icons are inline SVGs in `kpiIcons.tsx` (no icon lib).
- **Charts** (recharts) — `PipelineFunnelChart` + `StatusDonutChart` (colored from the status tokens via `utils/chartColors.ts` so they match `StatusBadge`), `TrendChart` (30-day area), and two `CountBarChart`s (by role, top skills). Charts read the current `useTheme()` so colors flip with the theme.
- **Lists** — upcoming interviews and recent activity (`ListGroup`, names link to `/candidates/:id`, `StatusBadge` pills).
- **Active Job Openings** — `ActiveJobOpeningsTable`: Job ID (`JOB-00n`), posted date, title + priority badge (`.priority--high|medium|low`), location, department, applicants; "View All" → `/configuration`. Data is the active roles (see below).

Charts are added under **`recharts`** (the only chart dependency). New chart chrome/colors go through `chartColors.ts`, not hardcoded hex.

### Interviews, evaluations & notifications
- **Scheduling:** in `CandidateDetailPage`'s `AddStatus`, choosing **Interview Scheduled** reveals a required **Interviewers** `SearchableMultiSelect` (options from `['assignable-users']`); the payload adds `interviewerUserIds`, and success invalidates `['notifications']` + `['my-interviews']`.
- **Notification bell (`components/NotificationBell.tsx`, navbar):** `['notifications']` query with a 60s `refetchInterval`; unread badge; dropdown of the latest ~15; clicking marks read (mutation) and navigates to the item's `linkUrl`; "Mark all read".
- **Dashboard "My interviews" (`components/dashboard/MyInterviewsCard.tsx`):** `['my-interviews']` list of the caller's assigned interviews with date/time (highlight <24h) and an evaluation-state badge (Pending/Draft/Submitted); rows link to `/interviews/:id`.
- **Interview page (`pages/InterviewPage.tsx`, `/interviews/:id`):** two columns — left `ReadOnlyCandidateProfile` (modern non-editable card: initials avatar, status pill, icon links for LinkedIn/GitHub/Portfolio, colorful skill badges via `utils/skillColors.ts`, CV Preview/Download reusing `previewCvFile`/`downloadCvFile`); right `EvaluationForm` driven by `utils/evaluationCriteria.ts` (sections A–D with 1–5 + comment, general assessment, recommendation, overall rating). Recommendation options are `Recommended/Hold/Reject/Other`; picking **Other** reveals a required "Please specify" text box (blocks Submit until filled). **Save draft** any time; **Submit** confirms via modal then locks (server returns 409 after). Admin+ also see other interviewers' evaluations read-only in an accordion. A 404 (not assigned / not admin) renders a friendly "not available" message.
- **Status timeline interviewer links (`components/StatusTimeline.tsx`):** the "Interview Scheduled" entry lists its interviewers; each name is a `<Link>` to `/interviews/{interviewId}` (from the entry's `interviewId` + `interviewers`).

### Configuration page (`pages/ConfigurationPage.tsx`, route `/configuration`, navbar link)
Manages **Roles applied / Job openings** and **Skills** lookups: a reusable `OptionSection` renders a table (all values incl. inactive via `includeInactive=true`) with Add/Edit modals and Delete. Query keys `['config','roles','all']` / `['config','skills','all']`; mutations invalidate the `['config']` prefix so candidate forms refresh too. The Roles section passes `jobFields` so its modal/table also edit **Location, Department, Priority, Posted date** — the posting metadata shown in the dashboard's Active Job Openings table.

### Status colors (`utils/statusColors.ts` + `components/StatusBadge.tsx`)
`getStatusClass(status)` maps a status to a **tone** modifier class (`status--reject|success|interview|assessment|muted|uploaded|intake`). The colors are CSS design tokens in `index.css` (`--status-color` solid for the dot, `--status-tint` translucent for the badge background), with a `[data-bs-theme="dark"]` override block so a future dark theme just flips `data-bs-theme` on `<html>` — no component changes. Use the shared `StatusBadge` / `StatusDot` components (do not reintroduce per-call Bootstrap `bg-*` variants); applied to the candidate list, detail header, and `StatusTimeline`.

### CV preview (`CvFilesCard` in `CandidateDetailPage`)
Each CV file has **Preview** + **Download**. Preview calls `previewCvFile` (authenticated blob → object URL) and renders PDFs in an `<iframe>` (`.cv-preview-frame`); non-PDF types show a friendly fallback and keep Download. Object URLs are revoked on change/unmount.

### Login
`LoginPage` no longer hints credentials (placeholders removed, `autoComplete="off"`, no app-prefill).

## Theme (`index.css`)
- Microsoft Fluent: primary `#0078d4`, neutral surfaces, depth shadows, Segoe UI. Defined as `--ms-*` variables and mapped onto Bootstrap's `--bs-*` (including `--bs-btn-*` for buttons, which Bootstrap 5.3 reads).
- Custom classes: `.app-navbar`, `.app-logo-img`, `.login-shell`/`.login-card`, status badge tint, modal elevation, dashboard KPI cards (`.kpi-card`, `.kpi--<tone>`, `.kpi-card__icon/__bar`), and priority badges (`.priority-badge`, `.priority--high|medium|low`) — all with `[data-bs-theme="dark"]` overrides.
- **Don't hardcode colors** in components — rely on the `--ms-*` tokens / Bootstrap classes which inherit the theme. Avoid fixed light utilities like `bg-light`/`bg-white`/`text-dark` (use `bg-body-tertiary` etc. so they adapt to dark mode).

### Dark mode / theming
- **Token flip:** light is the `:root` `--ms-*` tokens; a `[data-bs-theme="dark"]` block in `index.css` overrides those neutrals/accents. Because the `--bs-*` variables map to `--ms-*`, the whole app (navbar, cards, tables, forms, modals, login, searchable menus, badges, status colors) flips automatically. Bootstrap 5.3 / react-bootstrap also honor `data-bs-theme`.
- **State:** `theme/ThemeContext.tsx` (`ThemeProvider` + `useTheme`) holds `'light' | 'dark'`, sets `data-bs-theme` on `<html>`, and persists to `localStorage['rg-theme']`. Wrapped around `<App/>` in `main.tsx`.
- **No-flash init:** an inline script in `index.html` sets the attribute before paint (saved choice → else OS `prefers-color-scheme`).
- **Toggle:** `components/ThemeToggle.tsx` (sun/moon, no dependency) in the navbar and on the login card.
- **Dark-only tweaks:** the dark login gradient and a white "chip" behind the (dark-inked) brand logo so it stays legible. When adding UI, verify both modes and don't reintroduce hardcoded light classes.

## Build / typecheck
```bash
cd client
npm run dev          # dev server (proxy + LAN host)
npx tsc -b           # typecheck (run after edits)
npm run build        # tsc -b && vite build
```
The `.docx`/PDF flows and auth need the backend running; see [dev-setup.md](dev-setup.md).
