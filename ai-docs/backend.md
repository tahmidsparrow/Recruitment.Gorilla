# Backend

ASP.NET Core Web API, .NET 10. Project root: `server/Recruitment.Gorilla.API/`.

## Structure
| Folder | Purpose |
|---|---|
| `Controllers/` | HTTP endpoints (thin). `AuthController`, `CandidatesController`, `CVUploadController`, `StatusOptionsController`, `ConfigurationController`, `UsersController`, `DashboardController`, `InterviewsController`, `NotificationsController`. |
| `Services/` | Business logic + EF access. `AuthService`, `CandidateService`, `CVParserService`, `StatusOptionService`, `ConfigurationService`, `UserService`, `DashboardService`, `InterviewService`, `NotificationService`. |
| `Models/` | EF entities. |
| `Data/AppDbContext.cs` | DbSets + Fluent config. |
| `DTOs/` | Request/response `record`s. |
| `Migrations/` | EF Core migrations (tracked in git). |
| `Uploads/` | Stored CV files (gitignored). |
| `Logs/` | log4net output (gitignored). |
| `Program.cs` | Composition root: DI, auth, CORS, pipeline. |

## Program.cs pipeline (order matters)
1. log4net logging provider (`AddLog4Net("log4net.config")`); log dir anchored via `RG_LOG_DIR` env var to `Logs/`.
2. Controllers, Swagger.
3. `AddDbContext<AppDbContext>` using MySQL connection string (fails fast if missing).
4. Service registrations (all scoped): `CandidateService`, `CVParserService`, `AuthService`, `UserService`, `CurrentUser`, `StatusOptionService`, `ConfigurationService`, `DashboardService`.
5. JWT auth (hardened — see [auth.md](auth.md)) + default-deny fallback authorization policy.
6. CORS from `AllowedOrigins`.
7. Pipeline: Swagger (Dev) → `UseCors` → **`UseAuthentication` → `UseAuthorization`** → `MapControllers`.

## EF Core & migrations
- Provider: Pomelo MySQL, pinned **9.0.0** (with EF Core Design/Tools 9.0.0). `dotnet-ef` CLI is installed globally at 9.0.0.
- Add a migration after changing entities or `AppDbContext`:
  ```bash
  cd server/Recruitment.Gorilla.API
  dotnet ef migrations add <Name>
  dotnet ef database update
  ```
- **Stop the running API before `dotnet build`/migrations** — the running process locks `bin/.../Recruitment.Gorilla.API.exe` and the build will fail with a file-lock error.
- Migrations are committed; never hand-edit the schema.

## Configuration & secrets
- Non-secret config in `appsettings.json`: `AllowedOrigins`, `Auth:Username`, `Jwt:Issuer/Audience/AccessTokenMinutes/RefreshTokenDays`, logging levels.
- **Secrets in .NET user secrets** (not committed): `ConnectionStrings:DefaultConnection`, `Jwt:Key`, `Auth:PasswordHash`. Setup in [dev-setup.md](dev-setup.md).

## CV upload & parsing
- `CVUploadController` (`POST /api/cvupload`): validates extension (`.pdf`/`.docx`) and size (≤10 MB), saves to `Uploads/{GUID}{ext}`, calls `CVParserService`, returns a `CVDraftDto` (pre-save draft for admin review — no DB record yet).
- `CVParserService.Parse` extracts text and pulls fields with regex/heuristics:
  - **PDF** via PdfPig (also reads hyperlink annotations to recover LinkedIn URLs shown as labels).
  - **Word** via DocumentFormat.OpenXml (paragraph text). Only `.docx` (not legacy `.doc`).
  - Email regex tolerates whitespace around `@`; name detection uses the leading ALL-CAPS run with double-space / clean-line fallbacks.
  - **LinkedIn and GitHub** URLs are pulled via the shared `MatchUrl` helper (visible text first, then hyperlink annotations); GitHub flows into `CVDraftDto.GithubUrl`.
- **Known limitation:** this is best-effort. The admin always reviews/edits before saving. Robust LLM-based extraction is deferred to Phase 2 — if you implement it, send the extracted raw text to Claude and return structured JSON, keeping the human-review step.

## File storage
Local disk under `Uploads/`, named `{GUID}{ext}` to avoid collisions; original name kept in `CVFile.OriginalFileName`. Download streams via `CandidatesController.GetCvFile` (`PhysicalFile(...)`) and requires auth. Deleting a candidate removes its files from disk.

## Status options
- Status labels are stored in the `StatusOptions` lookup table and served from `GET /api/status-options`.
- Initial upload statuses come from `GET /api/status-options/initial`.
- Valid next statuses for a candidate come from `GET /api/status-options/next/{candidateId}` and are backed by `StatusTransitions`.
- `CandidatesController` validates initial statuses, transitions, and prerequisites before saving.
- Prerequisite details are stored on `StatusHistory`: task details, submission URL, interview date/time, and comments.
- Future admin configuration can edit/add options and transitions against the same tables without changing candidate history storage.

## Dashboard aggregation
- `DashboardController` is `[Authorize]` (all roles). It splits into **org-wide** endpoints (no owner scope — every role sees the same figures) and one **owner-scoped** endpoint:
  - `GET /api/dashboard/kpis` → `DashboardService.GetKpisAsync()` — total/in-process/recommended/rejected/new-this-week/referred, bucketed from a single `GroupBy(CurrentStatus)` (terminal sets are `HashSet<string>` of the exact seeded status strings).
  - `GET /api/dashboard/status-breakdown` → `GetStatusBreakdownAsync()` ordered by `StatusOptions.SortOrder`.
  - `GET /api/dashboard/applications-trend?days=` → `GetApplicationsTrendAsync(days)`; `days ∈ {7,30,90}` (else 30); groups `CreatedAt.Date` and **zero-fills** missing days in C#.
  - `GET /api/dashboard/job-openings` → `GetJobOpeningsAsync()` — **open** roles only (`IsActive && EndDate >= now`) projected to `JobOpeningDto` (incl. `EndDate`), applicant counts derived by role.
  - `GET /api/dashboard` → `GetScopedAsync(ownerUserId)` — the candidate-centric remainder (**by-role, top-skills, upcoming interviews, recent activity**), owner-scoped like `CandidatesController` (`ReadOwnerScope`: null for Admin+, else the caller's id). The frontend only calls this for `canWriteCandidates` roles.
- **Upcoming interviews** come from the `Interviews` table (`ScheduledAt >= now` **and** candidate still `Interview Scheduled`) — not `StatusHistory.InterviewAt` — so completed/rejected or re-scheduled candidates don't linger or duplicate.
- **MySQL translation note:** group by a scalar FK (e.g. `cs.SkillOptionId`, `c.RoleAppliedOptionId`) then resolve names/rows from a dictionary — grouping directly by a joined navigation (`cs.SkillOption.Name`) is **not** translatable by Pomelo and throws at runtime.

## Interviews, evaluations & notifications
- Moving a candidate to **Interview Scheduled** now also requires `InterviewerUserIds` (≥1 active user). `CandidateService.ValidateStatusChangeAsync` enforces it; `AddStatusAsync` creates the `Interview` + `InterviewInterviewer` rows (linked to the new `StatusHistory` via nav) and one `Notification` per interviewer, then returns the history entry. It also accepts optional `InterviewTypeOptionIds` (validated as active `InterviewTypeOption`s) → `InterviewTag` rows; the tag names are surfaced in `StatusHistoryDto.InterviewTags`.
- **Interview types** are an admin-configurable lookup like Skills: CRUD at `/api/config/interview-types` (Admin+, `ConfigurationService.*InterviewType*`, soft-disable on delete when referenced by a tag); the schedule form reads the active list from `GET /api/interviews/types` (`[Authorize]`, any role — same reason `assignable-users` lives on `InterviewsController`, since `/config/*` is Admin+ only). The returned `StatusHistoryDto` (and every entry in candidate detail) carries `InterviewId` + `Interviewers` — resolved by matching `Interview.StatusHistoryId` — so the timeline links each interviewer name to `/interviews/{id}`. `GetByIdAsync` includes `Candidate.Interviews` (`.AsSplitQuery()`).
- Moving a candidate to **Interview Completed** requires a comment **and ≥1 submitted interviewer evaluation** on the candidate's latest interview (else 400). On success `AddStatusAsync` links the entry (`StatusHistory.InterviewId`) to that interview. `ToStatusHistoryDto` then surfaces a **live, structured** per-interviewer summary in `StatusHistoryDto.EvaluationSummaries` (`EvaluationSummaryDto`: interviewer name, overall rating, recommendation + Other text, submitted date) resolved from the linked interview's submitted evaluations — rendered as cards on the timeline, not baked into the comment. It also sets the DTO's `InterviewId` to `scheduled?.Id ?? s.InterviewId` so completed entries link to `/interviews/{id}` too. A `Interview Completed → Interview Scheduled` transition (seed Id 31) allows a second round via the normal scheduling flow.
- `InterviewService` — `GetMineAsync` (assigned interviews + eval state), `GetDetailAsync(id, userId, isAdmin)` (**access = assigned OR Admin+**, returns the candidate snapshot via `CandidateService.GetByIdAsync`, the caller's evaluation, — Admin+ only — every evaluation, `Notes` = the scheduled entry's comment via `.Include(i => i.StatusHistory)`, and `InterviewTags` = the interview's type tag names), `UpsertEvaluationAsync` (assigned-only; validates criterion keys/ratings/recommendation against `Models/EvaluationCriteria.cs` — recommendations are `Recommended/Hold/Reject/Other`, and **`Other` requires `RecommendationOther` text** (else 400); **Conflict once `IsSubmitted`**), `GetAssignableUsersAsync`. **Submit-time gate** (`dto.Submit` only; drafts unrestricted): a final recommendation, an overall rating, and **all 12 criterion ratings** are required, else 400.
- `NotificationService` — `GetMineAsync` (+unread count), `MarkReadAsync`, `MarkAllReadAsync`; all scoped to the caller's `UserId`.
- Both controllers are `[Authorize]` (all roles) and derive the caller from `CurrentUser`. `assignable-users` lives on `InterviewsController` because `UsersController` is class-level SuperAdmin-only.

## Logging
log4net (`log4net.config`): console + daily rolling file under `Logs/`. App categories log at INFO; framework noise at WARN. Log audit events on writes.

## API surface (current)
| Method | Route | Auth | Purpose |
|---|---|---|---|
| GET | `/api/dashboard/kpis` · `/status-breakdown` · `/applications-trend?days=` · `/job-openings` | required (any role) | **Org-wide** figures — every role sees the same numbers |
| GET | `/api/dashboard` | required | **Owner-scoped** remainder: by-role/top-skill counts, upcoming interviews, recent activity |
| GET | `/api/interviews/assignable-users` | required | Active users assignable as interviewers |
| GET | `/api/interviews/mine` | required | Interviews the caller is assigned to (+ their eval state) |
| GET | `/api/interviews/{id}` | required | Interview detail (assigned interviewer or Admin+; 404 otherwise) |
| PUT | `/api/interviews/{id}/evaluation` | required | Save/submit the caller's evaluation (409 once submitted) |
| GET | `/api/notifications` | required | Caller's notifications + unread count |
| POST | `/api/notifications/{id}/read` · `/read-all` | required | Mark one / all read |
| POST | `/api/auth/login` | anon | Issue access token + refresh cookie |
| POST | `/api/auth/refresh` | anon (cookie) | Rotate refresh, new access token |
| POST | `/api/auth/logout` | anon (cookie) | Revoke refresh, clear cookie |
| POST | `/api/cvupload` | required | Upload CV → extracted draft |
| GET | `/api/candidates` | required | Paged list (search, status filter) |
| POST | `/api/candidates` | required | Create (409 on duplicate email unless `allowDuplicate`) |
| GET | `/api/candidates/{id}` | required | Detail + CV files + status history |
| PUT | `/api/candidates/{id}` | required | Update profile |
| POST | `/api/candidates/{id}/status` | required | Append status change |
| GET | `/api/candidates/{id}/cv/{fileId}` | required | Stream original CV file |
| GET | `/api/candidates/roles` | required | Distinct applied-role values (role suggestions) |
| GET | `/api/candidates/role-options` · `/skill-options` | CanWriteCandidate | Active Role/Skill options for the candidate create/edit forms — so **Recruiters** (blocked from the Admin-only `/config/*`) can populate the dropdowns |
| DELETE | `/api/candidates/{id}` | required | Delete candidate + files |
| GET | `/api/status-options` | required | Active status dropdown options |
| GET | `/api/status-options/initial` | required | Initial status dropdown options |
| GET | `/api/status-options/next/{candidateId}` | required | Allowed next statuses for a candidate |
| GET/POST | `/api/config/roles` | Admin+ | List (active, or `?includeInactive=true`) / create Role Applied options (job-opening fields: required **EndDate**, Location/Department from fixed sets, Priority, optional **RecruiterUserId**). Returns computed `Title` + `CreatedAt` (posted date) + `RecruiterName` |
| PUT | `/api/config/roles/{id}` | Admin+ | Update a Role Applied option |
| DELETE | `/api/config/roles/{id}` | **SuperAdmin** | Soft-disable if it has candidates (returns `{deleted,deactivated,candidateCount}`), else hard-delete |
| GET/POST | `/api/config/skills` | required | List / create Skill options |
| PUT/DELETE | `/api/config/skills/{id}` | required | Update / soft-disable-or-delete a Skill option |

Config notes: `ConfigurationService` enforces unique names (409 on duplicate), validates a role's **required EndDate**, its Location/Department against `Models/JobOpeningOptions.cs`, and (when set) that `RecruiterUserId` is an existing active user (400 otherwise), and **soft-disables** (IsActive=false) a role/skill referenced by a candidate instead of hard-deleting. **Role delete is SuperAdmin-only.** `CandidateService.ValidateCandidateAsync` checks required full name, valid email, required **relevant experience** (free text), and that any selected role/skill IDs exist and are active (400 otherwise). **End-date lock:** `CandidateService.GetRoleLockErrorAsync` / `ValidateStatusChangeAsync` block profile updates and status changes once the candidate's role `EndDate` has passed (returns a 400 error string); `CandidateDetailDto` carries `RoleEndDate` + `RoleClosed` for the UI. **CV preview** reuses the existing authenticated `GET /api/candidates/{id}/cv/{fileId}` endpoint — the client fetches it as a blob and renders PDFs inline; no separate preview route was added.

Swagger UI is at `http://localhost:5000/swagger` in Development.
