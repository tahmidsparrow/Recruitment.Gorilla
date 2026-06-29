# Conventions

Match these patterns. Consistency is the point — prefer the existing approach over a "better" new one.

## Backend (ASP.NET Core, C#)

### Layering: Controller → Service → AppDbContext
- **Controllers** are thin: validate/shape input, call a service, map to an HTTP result. No EF queries or business logic in controllers. See `Controllers/CandidatesController.cs`.
- **Services** hold business logic and own all EF Core access via `AppDbContext`. See `Services/CandidateService.cs`, `AuthService.cs`.
- **AppDbContext** (`Data/AppDbContext.cs`) declares `DbSet<>`s and Fluent config in `OnModelCreating` (max lengths, required, relationships, cascade).

### Style
- **Primary constructors** for DI: `public class CandidateService(AppDbContext db, IWebHostEnvironment env)`. Controllers too: `public class CandidatesController(CandidateService candidateService, ILogger<CandidatesController> logger)`.
- **DTOs are `record` types** in `DTOs/` — never expose EF entities directly. Separate DTOs per use: e.g. `CreateCandidateDto`, `UpdateCandidateDto`, `CandidateListItemDto`, `CandidateDetailDto`, `CVDraftDto`, `StatusChangeDto`, `AuthResultDto`.
- **Async all the way**: `await ...Async()` EF methods; controllers return `async Task<IActionResult>`.
- **Service return signals** instead of throwing for expected cases: return `null` for not-found, tuples/records for richer outcomes. Examples: `CreateAsync` returns `(CandidateDetailDto? Created, CandidateListItemDto? Duplicate)`; `DeleteAsync` returns `bool`. Controllers translate these to `NotFound()`, `Conflict(...)`, etc.
- **Logging**: inject `ILogger<T>`; log meaningful audit events on writes (create, duplicate, status change, delete, login). Use structured templates: `logger.LogInformation("Created candidate {Id} ('{Name}') by {ChangedBy}.", ...)`. Framework noise is quieted in `log4net.config`.
- **Auth**: data controllers carry `[Authorize]`; auth endpoints carry `[AllowAnonymous]`. There is also a **default-deny fallback policy** (see [auth.md](auth.md)), so new controllers are protected unless you opt out.

### HTTP result conventions
| Situation | Result |
|---|---|
| Created | `CreatedAtAction(nameof(GetById), new { id }, dto)` |
| Found | `Ok(dto)` |
| Not found | `NotFound()` |
| Validation/bad input | `BadRequest("message")` |
| Duplicate (warn-but-allow) | `Conflict(dto)` |
| Deleted | `NoContent()` |
| Unauthorized | `Unauthorized(new { message })` |

## Frontend (React + TypeScript)

### Data flow: types → api.ts → TanStack Query → component
- **`types/index.ts`** holds shared interfaces mirroring the API DTOs. Keep names/shapes in sync with the backend DTOs.
- **`services/api.ts`** is the only place that talks HTTP. One exported function per endpoint, fully typed; components never call Axios directly. The Axios instance has `baseURL = '/api'`, `withCredentials: true`, and auth interceptors.
- **TanStack Query** for server state:
  - Reads use `useQuery` with array keys: `['candidates', { search, status, page }]`, `['candidate', id]`.
  - Writes use `useMutation` and **invalidate** the relevant keys on success: `queryClient.invalidateQueries({ queryKey: ['candidates'] })`.
- **Components/pages** use react-bootstrap; no bespoke CSS frameworks. Pages live in `pages/`, reusable pieces in `components/`.

### ⚠️ JSON camelCase gotcha (important)
ASP.NET serializes with camelCase, and it lowercases **runs of leading capitals**. So C# `CVFiles` becomes JSON **`cvFiles`** (not `cVFiles`). Always match the real serialized name in `types/index.ts` and component code. When in doubt, check the actual response. (This caused a real crash — `data.cvFiles` was undefined.)

### Theme
- The Microsoft **Fluent** theme lives in `client/src/index.css` as CSS variables mapped onto Bootstrap's variables (`--ms-primary: #0078d4`, neutrals, depth shadows, Segoe UI). Use existing Bootstrap classes/components; they pick up the theme. Don't hardcode colors — reference the look already established (primary blue, 4px/8px radii, subtle shadows).
- Brand logo: `client/public/logo.png`, shown via `.app-logo-img`.

## File references in docs/PRs
Use clickable relative markdown links, e.g. `[CandidateService.cs](server/Recruitment.Gorilla.API/Services/CandidateService.cs)`, not bare backticks.

## Git
- Commit only when asked; branch off the default branch first if needed.
- **Never** add Claude/Anthropic or any AI as author/co-author.
- Keep commits logically scoped (one feature/fix per commit) with a descriptive body.
