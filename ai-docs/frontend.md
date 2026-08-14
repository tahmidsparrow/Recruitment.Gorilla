# Frontend

React 19 + TypeScript + Vite. Root: `client/`.

## Structure
| Path | Purpose |
|---|---|
| `src/main.tsx` | Entry; wraps app in `QueryClientProvider`; imports Figtree, Bootstrap CSS + `index.css`. |
| `src/App.tsx` | Router, `AuthProvider`, `ProtectedLayout` (auth guard only — chrome lives in `AppShell`), routes. |
| `src/navRoutes.ts` | **Single source for the sidebar items and topbar titles** — path, label, lucide icon, description, role gate. |
| `src/auth/AuthContext.tsx` | Auth state, login/logout, silent session restore. |
| `src/services/api.ts` | Typed Axios layer + auth interceptors (the only HTTP caller). |
| `src/types/index.ts` | Shared types mirroring API DTOs. |
| `src/pages/` | `DashboardPage`, `LoginPage`, `UploadPage`, `CandidatesPage`, `CandidateDetailPage`, `CandidateEvaluationReportPage`, `InterviewPage`, `ConfigurationPage`, `UsersPage`, `AuditLogPage`, `ChangePasswordPage`. |
| `src/pages/configuration/` | The Configuration tabs: `JobOpeningsTab`, `OptionChipsTab`, `EmailSettingsTab`. |
| `src/components/shell/` | App chrome: `AppShell` (layout + sidebar state), `SidebarNav`, `TopbarTitle`. |
| `src/components/ui/` | Shared primitives: `PageHeader`, `Pagination`, `EmptyState`, `ConfirmModal`, `Tabs` + `useTabs`. |
| `src/components/` | `BulkUploader`, `CandidateForm`, `StatusTimeline`, `SearchableSelect`, `StatusBadge`, `ThemeToggle`, `ToastStack`, `RequireRole`, `NotificationBell`, `ReadOnlyCandidateProfile`, `EvaluationForm`. |
| `src/components/dashboard/` | Dashboard widgets: `KpiCard`, `kpiIcons`, `StatusDonutChart`, `TrendChart`, `CountBarChart`, `ActiveJobOpeningsTable`, `MyInterviewsCard`, `DashboardHero`. |
| `src/utils/` | `statusColors.ts` (status → tone class); `chartColors.ts` (chart colors from status tokens + chrome read off the design tokens); `evaluationCriteria.ts` (interview-form catalog — keys match the backend); `skillColors.ts` (stable hash of a skill name → badge class); `jobStatus.ts` (job-opening lifecycle); `initials.ts`. |
| `src/styles/tokens.css` | **Design tokens — the single source of visual truth.** |
| `src/index.css` | Bootstrap bridge → Prism semantic layer → app-specific components. |
| `public/logo.png` | Brand logo. |
| `vite.config.ts` | Dev server host + `/api` proxy. |

## Design system (Prism)

The UI follows the **Ajentica Prism/Pulse** dashboard so the two products read
as one. `styles/tokens.css` holds the palette, radius/space/type scales and the
dark-mode overrides; `index.css` maps those onto Bootstrap's `--bs-*` so
react-bootstrap components inherit the design with no JSX change, then adds a
semantic class layer that pages are written against.

- **Never hardcode a colour.** Reference a token. The `--ms-*` names are legacy
  aliases onto the new ones and are being retired as files are touched.
- **Cards are flat**: 14px radius, 1px border, **no shadow**; hover changes the
  border. Shadows are reserved for things that float (dropdowns, modals).
- **Icons are `lucide-react`**, size 16 (20 in a KPI chip), `strokeWidth` 1.5–1.75.
  Don't hand-roll SVGs or use emoji.
- **Semantic classes** to reach for before stacking Bootstrap utilities:
  `.rg-content`, `.page-header`/`.page-eyebrow`, `.pulse-card`,
  `.metric-label`/`.metric-value`, `.table-wrap`/`.table-cards`/`.table-link`,
  `.badge-pill` + `.badge-success|warning|danger|info|neutral`, `.empty-state`,
  `.data-toolbar`, `.admin-tabs`, `.avatar`/`.who-cell`, `.cat-chip`,
  `.alert-*-soft`, `.form-section`.

### Mobile first — the house rule

Base rules describe the **phone**; `min-width` media queries enhance upward.
No `max-width` queries, and the phone is never the exception. Concretely:

- Base padding/gap is the tight one (12px), loosening at `≥576` and `≥768`.
- Touch targets are ≥44px in the base; the `≥768` block tightens them to the
  compact pointer scale (see `.nav-item-link`, `.app-sidebar__icon-btn`).
- **List tables use `.table-cards`**, which reflows each row into a labelled
  card in its base rules and restores table layout at `≥768`. Add
  `data-label="…"` to every `<td>`, `class="col-actions"` to the actions cell.
  **Do not reintroduce `d-none d-md-table-cell`** — it silently drops columns on
  small screens, which is what this replaced.
- Modals are full-height sheets with a pinned footer in the base; Bootstrap's
  centred dialog returns at `≥576`.
- Verify at **360 / 430 / 768 / 1280** in both themes, checking for horizontal
  overflow.

### Accessibility notes worth keeping

- Status is never colour-alone: `.badge-pill` variants carry a leading glyph.
- A fill that sits under white text uses `--primary-dark`, **not** `--primary`.
  `--primary` brightens in dark mode so it stays legible *as text*, which leaves
  white on top of it at ~2.2:1. The same reasoning drives `--kpi-ink` and
  `--eval-ink`, which flip the glyph to dark ink on bright dark-mode accents.
- Every token pairing was checked against WCAG AA; the tightest is `--muted` on
  `--surface-muted` (table headers) at 4.73:1. Re-check if you change them.

## Routing & layout (`App.tsx` + `components/shell/`)
- `/login` → `LoginPage` (public, outside the shell).
- All other routes are children of `ProtectedLayout`, which is now **only the
  auth gate**: spinner while `loading`, redirect to `/login` (preserving `from`)
  when unauthenticated, redirect to `/change-password` when `mustChangePassword`,
  otherwise render `<AppShell />`.
- **`AppShell`** is the chrome: a collapsible **left sidebar** beside a scrolling
  main column whose header is a sticky topbar and whose body is
  `.rg-content > <Outlet />`.
  - *Sidebar* (`SidebarNav`) — 248px, collapsing to a 64px icon rail (persisted
    to `localStorage['rg-sidebar']`); an off-canvas drawer with a scrim below
    768px. Three zones: brand + collapse control, the nav list from
    `navRoutes.ts`, then the theme toggle and the signed-in user's card
    (initials avatar, name linking to `/change-password`, logout).
  - *Topbar* (`TopbarTitle`) — the current route's icon, title and one-line
    description, prefix-matched so `/candidates/7` resolves to Candidates.
    `NotificationBell` sits in the topbar actions.
- **The topbar owns the page title**, so pages must not render their own `<h2>`
  heading — use `PageHeader` for the page's action button only. A heading that
  is *content* (a candidate's name) is fine.
- Adding a route means adding it to `navRoutes.ts` (label, lucide icon,
  description, `roles`) **and** to the `RequireRole` guard in `App.tsx`. The two
  are deliberately separate: `navRoutes` decides what is *shown*, `RequireRole`
  decides what is *reachable*, and a missing guard must never be covered for by
  a hidden nav item. `navRoutes.test.ts` covers the visibility side.
- **Candidate role/skill lookups** come from `getActiveRoleOptions`/`getActiveSkillOptions` (`/api/candidates/role-options` · `/skill-options`, `CanWriteCandidate`); `role-options` is server-scoped so a Recruiter only sees their assigned roles. `CandidateForm` **auto-selects** the role when the list has exactly one (a single-assigned recruiter). The **"Delete candidate"** button on `CandidateDetailPage` shows only for `isAdminOrAbove` (delete is Admin-only). The dashboard shows recruiter-only users a **role filter** (`Form.Select` of their assigned roles + "All") that feeds `getDashboard(roleId)` and the `['dashboard','scoped',roleId]` key.
- Routes: `/` → `DashboardPage` (landing), `/candidates` + `/candidates/:id` (Recruiter+, `RequireRole`), `/upload` (Recruiter+), `/interviews/:id` → `InterviewPage` (all roles), `/configuration` (Admin+), `/users` (SuperAdmin), `/change-password`. The **Dashboard** nav link (`to="/" end`) is first and visible to all roles; the **Candidates/Upload** links show only for `canWriteCandidates`. So an **Interviewer** (bottom of the hierarchy — `useAuth().isInterviewerOnly`) sees Dashboard only, plus the interview pages they're linked to. The **topbar** hosts a **`NotificationBell`** (all roles). Nav visibility is driven by `navRoutes.ts`, not by inline conditionals.

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
- **List** (`CandidatesPage`): paged table with **URL-synced filters** (`useSearchParams` — bookmarkable, survive refresh; a **Clear filters** link resets them): search by name/email/**phone**, database-backed status filter, **role filter** (job opening — `GET /candidates/role-filter-options`, includes inactive roles labelled "(inactive)"; scoped: Admin+ see all roles, a Recruiter sees their assigned roles), **skills multi-select** (ANY-of, active skills via `getActiveSkillOptions`), and a **Referred only** toggle. **Sortable headers** (Name/Status/Added → `sort`+`dir` params, default Added desc; click flips direction with a ▲/▼ indicator). Per-row delete (confirm modal, Admin+ only). Responsive: columns hide progressively on small screens (email shown under the name on mobile).
- **Detail** (`CandidateDetailPage`): **read-only by default**, styled like the interview page — an `interview-hero` header (avatar, name, role, `StatusBadge`) with **Edit** / **Evaluation report** / **Delete** actions. **Read mode** is two columns: `ReadOnlyCandidateProfile` (left, incl. CV preview/download) + the Status panel (right — the add-status form for writers + `StatusTimeline`). **Edit** (shown only when `canWriteCandidates && !roleClosed`) switches to a **focused single-column profile form** (`ProfileEditor`, with Save/Cancel and the `CvFilesCard`) and **hides the Status panel**; on Save or Cancel it returns to the two-column read view with refreshed data. Delete is a confirm modal (Admin+); the Evaluation report link goes to `/candidates/:id/evaluations`.
- **Evaluation report** (`CandidateEvaluationReportPage`, route `/candidates/:id/evaluations`, Recruiter+): fetches `getCandidateEvaluationReport(id)` and shows a summary panel (interviewer count, average overall, recommendation tally, per-criterion averages ordered by `EVALUATION_SECTIONS`) then every interviewer's full rubric grouped by interview, reusing `EvaluationReadOnly`. Has a **Print** button (`window.print()`, `d-print-none` chrome) and an empty state when no evaluations are submitted yet.

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
- **Notification bell (`components/NotificationBell.tsx`, topbar):** `['notifications']` query with a 60s `refetchInterval`; unread badge; dropdown of the latest ~15; clicking marks read (mutation) and navigates to the item's `linkUrl`; "Mark all read".
- **Dashboard "My interviews" (`components/dashboard/MyInterviewsCard.tsx`):** `['my-interviews']` list of the caller's assigned interviews with date/time (highlight <24h) and an evaluation-state badge (Pending/Draft/Submitted); rows link to `/interviews/:id`.
- **Interview page (`pages/InterviewPage.tsx`, `/interviews/:id`):** a **hero header card** (candidate **initials avatar + name + Role Applied For + interview type tags**, calendar chip with a relative badge Today/Tomorrow/In N days/Completed, interviewer avatar pills) above two columns with a staggered `.anim-fade-up` entry — left `ReadOnlyCandidateProfile` (non-editable card; **header** = "Position on Last Organization" + LinkedIn/GitHub/Portfolio icon links + status pill, no name/avatar; **body** = email/phone/**Relevant Experience** detail tiles, colorful skill badges via `utils/skillColors.ts`, an **extendable Summary** (Show more/less), and CV files as `.cv-file-item` tiles with Preview (`outline-primary`) + a **yellow `.btn-cv-download`** (hover lift + icon bounce) reusing `previewCvFile`/`downloadCvFile`); right `EvaluationForm` driven by `utils/evaluationCriteria.ts`. Sections A–D are **independent collapsible accent panels** (`.eval-panel--a|b|c|d`, react-bootstrap `Collapse`, per-section icon + live `n/3 rated · avg` summary, rotating chevron); ratings use a **segmented 1–5 pill group** (click again to clear, `aria-pressed`); a top progress bar tracks `Rated X of 12`; general assessment / recommendation / overall rating live in a static "Summary & recommendation" panel. Recommendation options are `Recommended/Hold/Reject/Other`; picking **Other** reveals a required "Please specify" text box (blocks Submit until filled). **Save draft** any time (never gated); **Submit is gated** — all 12 criterion ratings, a final recommendation, and an overall rating are required (red `*` indicators; a failed attempt sets `showErrors`, flags the empty groups via `.rating-group--invalid`, and toasts what's missing before the confirm modal opens). **Submit** confirms via modal then locks (server returns 409 after). Read-only/submitted views reuse the panels with **filled-dot rating scales**. Admin+ also see other interviewers' evaluations read-only in an accordion. A 404 (not assigned / not admin) renders a friendly "not available" message. All animations respect `prefers-reduced-motion`.
- **Status timeline interviewer links (`components/StatusTimeline.tsx`):** the "Interview Scheduled" entry shows its interviewers as **`.interviewer-pill` avatar pills** (initials + name), each a `<Link>` to `/interviews/{interviewId}`, plus the interview's **type tags** as `skillColorClass`-colored badges (from the entry's `interviewTags`). The **schedule form** (`CandidateDetailPage` AddStatus) adds an optional **Interview types** `SearchableMultiSelect` (from `getActiveInterviewTypes`) above the interviewers select. Timeline **dots** carry a soft `--status-tint` ring so they read distinctly from the tinted status badge. Comments render with `white-space: pre-line` (so the appended evaluation summary's line breaks show). An **"Interview Completed"** entry renders its `evaluationSummaries` as **cards** (initials avatar, interviewer name, overall-rating dots, a recommendation `status-badge` colored by outcome — Recommended/Hold/Reject/Other → success/intake/reject/muted, submitted date); Admin+ additionally get a **"View full evaluations →"** link to `/interviews/{id}` (gated by the `canViewEvaluations` prop = `isAdminOrAbove`). `cleanComment` strips any legacy baked-in "— Interview evaluations —" text so only the human comment shows above the cards.
- **Interview page notes:** scheduling with "Notes for interviewers" text (the relabeled optional comment on the Interview Scheduled add-status form) stores it as the scheduled entry's comment; `InterviewPage` shows it as a **"Notes from the recruiter"** info card above the candidate profile (`InterviewDetail.notes`). Re-scheduling from Interview Completed reuses the same add-status flow (the new `8 → 3` transition surfaces Interview Scheduled as a next option).
- **Peer evaluations:** `InterviewPage` renders an **"Other interviewers' evaluations"** accordion when `InterviewDetail.allEvaluations` is present (filtering the caller out). The backend only populates that list for Admin+, or for an assigned interviewer **after they submit & lock their own** (peers' submitted evaluations only) — so a peer can't preview colleagues before forming their own view.

### Audit trail page (`pages/AuditLogPage.tsx`, route `/audit`, Admin+)
A filterable, paginated view of `GET /api/audit` (`['audit', filters, page]`, `keepPreviousData`): a filter bar (entity-type select, action text-contains, from/to `datetime-local`) applies on submit; a table lists Time · Actor · Action (colored `Badge`) · Entity · Summary, with prev/next paging (50/page). Route + nav gated to `SuperAdmin`/`Admin` (`RequireRole` + `isAdminOrAbove`).

### Configuration data notes (`pages/configuration/`)
The page's structure is described under [Configuration page](#configuration-page-pagesconfigurationpagetsx--pagesconfiguration) further down; this covers the data contracts.

Query keys are `['config','roles','all']` / `['config','skills','all']` /
`['config','interview-types','all']`, all fetched with `includeInactive=true`;
mutations invalidate the `['config']` prefix so candidate forms refresh too.

- **Job openings** (`JobOpeningsTab`) — **Role name**, a required **Closes**
  (`datetime-local`), **Location**/**Department** as dropdowns (fixed sets
  mirroring `JobOpeningOptions.cs`), **Priority**, and optional **Recruiters**:
  a `SearchableMultiSelect` over active users (`getAssignableUsers`) whose
  option label is `"Name (email)"` so it matches on either. Each assigned
  recruiter can access every candidate under that role. **Delete is Super Admin
  only** and confirms first; the result toast reports whether the role was
  deleted or (having candidates) deactivated.
- **Interview types** work exactly like Skills — used as multi-select tags on
  the interview schedule form and shown as coloured badges.
- **Email / SMTP** (`EmailSettingsTab`, `isSuperAdmin` only) — host, port,
  username, password (`type=password`, write-only; placeholder "leave blank to
  keep" when `passwordSet`), from-address/name, STARTTLS + Enabled toggles, plus
  a **Send test email** button defaulting to the current user's email. Backed by
  `getEmailSettings`/`saveEmailSettings`/`sendTestEmail` (`/config/email*`); the
  password is never returned by the API.

### Status colors (`utils/statusColors.ts` + `components/StatusBadge.tsx`)
`getStatusClass(status)` maps a status to a **tone** modifier class (`status--reject|success|interview|assessment|muted|uploaded|intake`). The colors are CSS design tokens in `index.css` (`--status-color` solid for the dot, `--status-tint` translucent for the badge background), with a `[data-bs-theme="dark"]` override block so a future dark theme just flips `data-bs-theme` on `<html>` — no component changes. Use the shared `StatusBadge` / `StatusDot` components (do not reintroduce per-call Bootstrap `bg-*` variants); applied to the candidate list, detail header, and `StatusTimeline`.

### CV preview (`CvFilesCard` in `CandidateDetailPage`)
Each CV file has **Preview** + **Download**. Preview calls `previewCvFile` (authenticated blob → object URL) and renders PDFs in an `<iframe>` (`.cv-preview-frame`); non-PDF types show a friendly fallback and keep Download. Object URLs are revoked on change/unmount.

### Login
`LoginPage` no longer hints credentials (placeholders removed, `autoComplete="off"`, no app-prefill).

## Theme (`styles/tokens.css`)
- **Coastal teal `#468189`** on near-neutral surfaces, Figtree, 14px base. Token
  names and scales follow Prism; the palette descends from GorillaHR, which is
  where Prism's does too.
- Semantic **status / priority / skill / KPI / evaluation** colours are
  deliberately *not* derived from the brand hue and live in `index.css`.
  `utils/chartColors.ts` resolves `--status-color` off a hidden probe element
  rather than duplicating hexes, and reads chart chrome off the tokens.
- **Don't hardcode colours.** Avoid fixed light utilities like
  `bg-light`/`bg-white`/`text-dark` — use tokens or `bg-body-tertiary` so they
  adapt to dark mode.

### Dark mode / theming
- **Token flip:** light is `:root`; a `[data-bs-theme='dark']` block in
  `tokens.css` overrides the neutrals and accents. Because the `--bs-*`
  variables map onto the tokens, the whole app flips automatically. Bootstrap
  5.3 / react-bootstrap also honour `data-bs-theme`.
- **State:** `theme/ThemeContext.tsx` (`ThemeProvider` + `useTheme`) holds
  `'light' | 'dark'`, sets `data-bs-theme` on `<html>`, persists to
  `localStorage['rg-theme']`. Wrapped around `<App/>` in `main.tsx`.
- **No-flash init:** an inline script in `index.html` sets the attribute before
  paint (saved choice → else OS `prefers-color-scheme`).
- **Toggle:** `components/ThemeToggle.tsx` — `variant="sidebar"` in the shell
  footer, plain button on the login card.
- **The dark neutrals are deliberately low-saturation** (8–14% on the coastal
  hue) and text sits at 88% lightness, not 94%. A saturated dark ground reads as
  loud however dim it is, and ~15:1 text is past AA and into glare. Don't
  "enrich" them back.
- When adding UI, check both modes and re-read the accessibility notes above
  before putting white text on a coloured fill.

### Configuration page (`pages/ConfigurationPage.tsx` + `pages/configuration/`)
Four tabs rather than four stacked cards, with the active tab in the query
string (`?tab=skills`) via `useTabs`. Email is Super Admin only and its tab is
absent, not disabled, for everyone else.
- **Job openings** — full-width rows (`.job-row`), not a table: identity on the
  left, then status + a days-left figure, then the closing date with a progress
  bar through the posting window, then delete and a chevron. The row itself is
  the edit affordance; the delete button stops propagation. Stacked in the base,
  becoming a row at `≥992` (five columns of content need the width, so a tablet
  gets the stacked version).
  `utils/jobStatus.ts` supplies all three derived values: `jobStatus()` collapses
  `isActive` and `endDate` into one lifecycle value (inactive → closed →
  closing-soon → open — rendering those two as independent facts is what
  previously let a row show "Active" and "Closed" at once, so keep them
  collapsed), plus `daysUntil()` and `elapsedPercent()`. `elapsedPercent`
  returns `null` when it can't be computed and the bar is then **omitted** —
  an unknown must not render as a real answer of 0%.
- **Skills / Interview types** — one `OptionChipsTab` used twice; coloured pills
  with an inline remove and an add field in the flow of the chips.
- **Email** — grouped into Server / Credentials / Sender fieldsets.
- **`sortOrder` is not in the UI.** It is still sent — auto-assigned `last + 1`
  on create, preserved on edit. Don't surface it again; if reordering is needed
  it should be drag-and-drop.

## Build / typecheck
```bash
cd client
npm run dev          # dev server (proxy + LAN host)
npx tsc -b           # typecheck (run after edits)
npm run build        # tsc -b && vite build
```
The `.docx`/PDF flows and auth need the backend running; see [dev-setup.md](dev-setup.md).
