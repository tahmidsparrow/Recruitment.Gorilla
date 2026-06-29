# Backend

ASP.NET Core Web API, .NET 10. Project root: `server/Recruitment.Gorilla.API/`.

## Structure
| Folder | Purpose |
|---|---|
| `Controllers/` | HTTP endpoints (thin). `AuthController`, `CandidatesController`, `CVUploadController`, `StatusOptionsController`, `ConfigurationController`. |
| `Services/` | Business logic + EF access. `AuthService`, `CandidateService`, `CVParserService`, `StatusOptionService`, `ConfigurationService`. |
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
4. Service registrations: `CandidateService`, `CVParserService`, `AuthService`, `StatusOptionService` (all scoped).
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

## Logging
log4net (`log4net.config`): console + daily rolling file under `Logs/`. App categories log at INFO; framework noise at WARN. Log audit events on writes.

## API surface (current)
| Method | Route | Auth | Purpose |
|---|---|---|---|
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
| DELETE | `/api/candidates/{id}` | required | Delete candidate + files |
| GET | `/api/status-options` | required | Active status dropdown options |
| GET | `/api/status-options/initial` | required | Initial status dropdown options |
| GET | `/api/status-options/next/{candidateId}` | required | Allowed next statuses for a candidate |
| GET/POST | `/api/config/roles` | required | List (active, or `?includeInactive=true`) / create Role Applied options |
| PUT/DELETE | `/api/config/roles/{id}` | required | Update / soft-disable-or-delete a Role Applied option |
| GET/POST | `/api/config/skills` | required | List / create Skill options |
| PUT/DELETE | `/api/config/skills/{id}` | required | Update / soft-disable-or-delete a Skill option |

Config notes: `ConfigurationService` enforces unique names (409 on duplicate) and **soft-disables** (IsActive=false) an option that's referenced by a candidate instead of hard-deleting. `CandidateService.ValidateCandidateAsync` checks required full name, valid email, and that any selected role/skill IDs exist and are active (400 otherwise). **CV preview** reuses the existing authenticated `GET /api/candidates/{id}/cv/{fileId}` endpoint — the client fetches it as a blob and renders PDFs inline; no separate preview route was added.

Swagger UI is at `http://localhost:5000/swagger` in Development.
