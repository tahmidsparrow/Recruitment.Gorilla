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
| `src/index.css` | Coastal theme (CSS variables). |
| `public/logo.png` | Brand logo. |
| `vite.config.ts` | Dev server host + `/api` proxy. |

## Routing & layout (`App.tsx`)
- `/login` → `LoginPage` (public).
- All other routes are children of `ProtectedLayout`, which:
  - shows a spinner while `loading` (initial silent refresh in flight),
  - redirects to `/login` (preserving `from`) when not authenticated,
  - otherwise renders the **app bar** (logo, nav links with Fluent pivot underline, username + Sign out) and `<Outlet />`.
- **Candidate role/skill lookups** come from `getActiveRoleOptions`/`getActiveSkillOptions` (`/api/candidates/role-options` · `/skill-options`, `CanWriteCandidate`); `role-options` is server-scoped so a Recruiter only sees their assigned roles. `CandidateForm` **auto-selects** the role when the list has exactly one (a single-assigned recruiter). The **"Delete candidate"** button on `CandidateDetailPage` shows only for `isAdminOrAbove` (delete is Admin-only). The dashboard shows recruiter-only users a **role filter** (`Form.Select` of their assigned roles + "All") that feeds `getDashboard(roleId)` and the `['dashboard','scoped',roleId]` key.
- Routes: `/` → `DashboardPage` (landing), `/candidates` + `/candidates/:id` (Recruiter+, `RequireRole`), `/upload` (Recruiter+), `/interviews/:id` → `InterviewPage` (all roles), `/configuration` (Admin+), `/users` (SuperAdmin), `/change-password`. The **Dashboard** nav link (`to="/" end`) is first and visible to all roles; the **Candidates/Upload** links show only for `canWriteCandidates`. So an **Interviewer** (bottom of the hierarchy — `useAuth().isInterviewerOnly`) sees Dashboard only, plus the interview pages they're linked to. The navbar also hosts a **`NotificationBell`** (all roles).

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
- **List** (`CandidatesPage`): paged table, search by name/email, database-backed status filter, **role filter** (job opening — `GET /candidates/role-filter-options`, includes inactive roles labelled "(inactive)"; scoped: Admin+ see all roles, a Recruiter sees their assigned roles), per-row delete (confirm modal, Admin+ only). Responsive: columns hide progressively on small screens (email shown under the name on mobile).
- **Detail** (`CandidateDetailPage`): editable profile, database-backed add-status dropdown that only shows valid next statuses, dynamic prerequisite fields, `StatusTimeline` (newest on top), CV download links, delete (confirm modal).

Both the upload `CandidateForm` and the detail `ProfileEditor` include **GitHub URL**, **Portfolio website**, a **Role applied for** single-select and a **Skills** multi-select (both `components/SearchableSelect.tsx`, fed by `['config','roles']` / `['config','skills']` — configured values only, **not creatable** from the candidate form), and a **"This candidate has been referred"** checkbox revealing Reference name\* / email\* / Employee ID. Forms validate required full name + email format client-side (mirrored server-side); the legacy free-text role datalist was replaced by the configured role select.

### Dashboard (`pages/DashboardPage.tsx`, route `/`)
**One `useQuery` per section** (no single payload), rendered as react-bootstrap `Row`/`Col`/`Card`:
the org-wide queries `['dashboard','kpis']`, `['dashboard','status-breakdown']`,
`['dashboard','trend',days]`, `['dashboard','job-openings']` render **for every role**; the
owner-scoped `['dashboard','scoped']` (`enabled: canWriteCandidates`) feeds the candidate-centric
sections and renders only for candidate-managing roles. An **Interviewer** therefore sees the same
KPIs / charts / openings as an Admin, plus their My-Interviews card, but not By-role/Top-skills/
Upcoming/Activity.
- **Hero kicker** — `components/dashboard/DashboardHero`: greeting + user name + date and
  **pending-task chips** from `['my-interviews']` / `['notifications']` + the KPI query's
  `inProcess`. Styled `.dashboard-hero-kicker` + `.hero-chip` (Coastal gradient, `anim-fade-up`,
  dark + reduced-motion).
- **KPI cards** — six `components/dashboard/KpiCard`s (accent icon chip, big value, sub-label + %,
  thin progress bar; `.kpi--<tone>` tokens, light + dark, reduced-motion). Icons inline in
  `kpiIcons.tsx`.
- **Charts** (recharts) — `StatusDonutChart` (colored from the status tokens via
  `utils/chartColors.ts` so it matches `StatusBadge`) beside `TrendChart` (area) with a **7D/30D/90D
  range toggle** (`btn-group` → `trendDays` state → query key + `getApplicationsTrend(days)`), and
  two `CountBarChart`s (by role, top skills). (The redundant pipeline funnel was removed — the donut
  is the single status visual.) Charts read `useTheme()` so colors flip with the theme.
- **Lists** — upcoming interviews and recent activity (`ListGroup`, names link to
  `/candidates/:id`, `StatusBadge` pills).
- **Active Job Openings** — `ActiveJobOpeningsTable`: Job ID (`JOB-00n`), posted date, title +
  priority badge, location, department, **End date** (+ a `.job-closing-soon` badge when within 7
  days), applicants; "View All" → `/configuration`. Backend returns **open** roles only (past their
  End date drop off).

Charts are added under **`recharts`** (the only chart dependency). New chart chrome/colors go through `chartColors.ts`, not hardcoded hex.

### Interviews, evaluations & notifications
- **Scheduling:** in `CandidateDetailPage`'s `AddStatus`, choosing **Interview Scheduled** reveals a required **Interviewers** `SearchableMultiSelect` (options from `['assignable-users']`); the payload adds `interviewerUserIds`, and success invalidates `['notifications']` + `['my-interviews']`.
- **Notification bell (`components/NotificationBell.tsx`, navbar):** `['notifications']` query with a 60s `refetchInterval`; unread badge; dropdown of the latest ~15; clicking marks read (mutation) and navigates to the item's `linkUrl`; "Mark all read".
- **Dashboard "My interviews" (`components/dashboard/MyInterviewsCard.tsx`):** `['my-interviews']` list of the caller's assigned interviews with date/time (highlight <24h) and an evaluation-state badge (Pending/Draft/Submitted); rows link to `/interviews/:id`.
- **Interview page (`pages/InterviewPage.tsx`, `/interviews/:id`):** a **hero header card** (candidate **initials avatar + name + Role Applied For + interview type tags**, calendar chip with a relative badge Today/Tomorrow/In N days/Completed, interviewer avatar pills) above two columns with a staggered `.anim-fade-up` entry — left `ReadOnlyCandidateProfile` (non-editable card; **header** = "Position on Last Organization" + LinkedIn/GitHub/Portfolio icon links + status pill, no name/avatar; **body** = email/phone/**Relevant Experience** detail tiles, colorful skill badges via `utils/skillColors.ts`, an **extendable Summary** (Show more/less), and CV files as `.cv-file-item` tiles with Preview (`outline-primary`) + a **yellow `.btn-cv-download`** (hover lift + icon bounce) reusing `previewCvFile`/`downloadCvFile`); right `EvaluationForm` driven by `utils/evaluationCriteria.ts`. Sections A–D are **independent collapsible accent panels** (`.eval-panel--a|b|c|d`, react-bootstrap `Collapse`, per-section icon + live `n/3 rated · avg` summary, rotating chevron); ratings use a **segmented 1–5 pill group** (click again to clear, `aria-pressed`); a top progress bar tracks `Rated X of 12`; general assessment / recommendation / overall rating live in a static "Summary & recommendation" panel. Recommendation options are `Recommended/Hold/Reject/Other`; picking **Other** reveals a required "Please specify" text box (blocks Submit until filled). **Save draft** any time (never gated); **Submit is gated** — all 12 criterion ratings, a final recommendation, and an overall rating are required (red `*` indicators; a failed attempt sets `showErrors`, flags the empty groups via `.rating-group--invalid`, and toasts what's missing before the confirm modal opens). **Submit** confirms via modal then locks (server returns 409 after). Read-only/submitted views reuse the panels with **filled-dot rating scales**. Admin+ also see other interviewers' evaluations read-only in an accordion. A 404 (not assigned / not admin) renders a friendly "not available" message. All animations respect `prefers-reduced-motion`.
- **Status timeline interviewer links (`components/StatusTimeline.tsx`):** the "Interview Scheduled" entry shows its interviewers as **`.interviewer-pill` avatar pills** (initials + name), each a `<Link>` to `/interviews/{interviewId}`, plus the interview's **type tags** as `skillColorClass`-colored badges (from the entry's `interviewTags`). The **schedule form** (`CandidateDetailPage` AddStatus) adds an optional **Interview types** `SearchableMultiSelect` (from `getActiveInterviewTypes`) above the interviewers select. Timeline **dots** carry a soft `--status-tint` ring so they read distinctly from the tinted status badge. Comments render with `white-space: pre-line` (so the appended evaluation summary's line breaks show). An **"Interview Completed"** entry renders its `evaluationSummaries` as **cards** (initials avatar, interviewer name, overall-rating dots, a recommendation `status-badge` colored by outcome — Recommended/Hold/Reject/Other → success/intake/reject/muted, submitted date); Admin+ additionally get a **"View full evaluations →"** link to `/interviews/{id}` (gated by the `canViewEvaluations` prop = `isAdminOrAbove`). `cleanComment` strips any legacy baked-in "— Interview evaluations —" text so only the human comment shows above the cards.
- **Interview page notes:** scheduling with "Notes for interviewers" text (the relabeled optional comment on the Interview Scheduled add-status form) stores it as the scheduled entry's comment; `InterviewPage` shows it as a **"Notes from the recruiter"** info card above the candidate profile (`InterviewDetail.notes`). Re-scheduling from Interview Completed reuses the same add-status flow (the new `8 → 3` transition surfaces Interview Scheduled as a next option).

### Audit trail page (`pages/AuditLogPage.tsx`, route `/audit`, Admin+ navbar link)
A filterable, paginated view of `GET /api/audit` (`['audit', filters, page]`, `keepPreviousData`): a filter bar (entity-type select, action text-contains, from/to `datetime-local`) applies on submit; a table lists Time · Actor · Action (colored `Badge`) · Entity · Summary, with prev/next paging (50/page). Route + nav gated to `SuperAdmin`/`Admin` (`RequireRole` + `isAdminOrAbove`).

### Configuration page (`pages/ConfigurationPage.tsx`, route `/configuration`, navbar link)
Manages **Roles applied / Job openings**, **Skills**, and **Interview Types** lookups: a reusable `OptionSection` renders a table (all values incl. inactive via `includeInactive=true`) with Add/Edit modals and Delete. Interview Types (`queryKey="interview-types"`, `/config/interview-types`) work exactly like Skills — used as multi-select tags on the interview schedule form and shown as colored badges. Query keys `['config','roles','all']` / `['config','skills','all']`; mutations invalidate the `['config']` prefix so candidate forms refresh too. The Roles section (`jobFields`) uses the label **"Role Name"**, shows a read-only auto **Title** preview (`name — posted date`) and read-only **Posted date** (= `createdAt`), a required **End date & time** (`datetime-local`), **Location**/**Department** as dropdowns (fixed sets mirroring `JobOpeningOptions.cs`), Priority, and optional **Recruiters** — a `SearchableMultiSelect` over active users (`getAssignableUsers`) whose option label is `"Name (email)"` so it matches on either; the assigned recruiter names show (comma-joined) in the table. Each assigned recruiter can access every candidate under that role. Rows past their End date show a red **Closed** marker. **Delete is shown only to Super Admins** and opens a confirm modal; the result toast reports whether the role was deleted or (having candidates) deactivated.

### Status colors (`utils/statusColors.ts` + `components/StatusBadge.tsx`)
`getStatusClass(status)` maps a status to a **tone** modifier class (`status--reject|success|interview|assessment|muted|uploaded|intake`). The colors are CSS design tokens in `index.css` (`--status-color` solid for the dot, `--status-tint` translucent for the badge background), with a `[data-bs-theme="dark"]` override block so a future dark theme just flips `data-bs-theme` on `<html>` — no component changes. Use the shared `StatusBadge` / `StatusDot` components (do not reintroduce per-call Bootstrap `bg-*` variants); applied to the candidate list, detail header, and `StatusTimeline`.

### CV preview (`CvFilesCard` in `CandidateDetailPage`)
Each CV file has **Preview** + **Download**. Preview calls `previewCvFile` (authenticated blob → object URL) and renders PDFs in an `<iframe>` (`.cv-preview-frame`); non-PDF types show a friendly fallback and keep Download. Object URLs are revoked on change/unmount.

### Login
`LoginPage` no longer hints credentials (placeholders removed, `autoComplete="off"`, no app-prefill).

## Theme (`index.css`)
- **Coastal** (shared with the GorillaHR project): primary teal `#468189`, deep-navy ink `#031926`, cool neutral surfaces, depth shadows, Segoe UI. Defined as `--ms-*` variables and mapped onto Bootstrap's `--bs-*` (including `--bs-btn-*` for buttons, which Bootstrap 5.3 reads). Semantic status/priority/skill colors are intentionally kept distinct from the brand hue.
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
