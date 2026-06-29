# Spec — Candidate Profile Fields + Reference Section

**Status:** Implemented
**Author:** planning session
**Date:** 2026-06-29

> Implement this following [../feature-playbook.md](../feature-playbook.md) and
> [../conventions.md](../conventions.md). It is additive and reuses the existing
> create/update flow — **no new candidate endpoints** except a small role-suggestions
> lookup. Watch the JSON **camelCase** rule when adding TS types.

## 1. Summary
Extend the candidate profile with **GitHub URL**, **Portfolio Website**, the **role the candidate is interviewing for** (a searchable/creatable dropdown), and a single **Reference** section (referred-by name / email / employee id) gated behind a "candidate has been referred" checkbox.

## 2. Motivation
Recruiters need richer candidate context (developer links, the role under consideration) and a record of who referred a candidate. Reference details are only meaningful when the candidate was actually referred, so they're conditionally required.

## 3. Scope
**In scope**
- New profile fields: `GithubUrl`, `PortfolioUrl`, `AppliedRole`.
- Single reference: `IsReferred` + `ReferenceName`, `ReferenceEmail`, `ReferenceEmployeeId`.
- Capture on the upload review form **and** edit on the candidate detail profile editor; display on the detail page.
- `AppliedRole` shown as a **searchable, creatable dropdown** (type new or pick a previously-used role).
- Auto-extract GitHub URL from the CV (like LinkedIn).

**Out of scope / later**
- Multiple references per candidate (this is a single reference; revisit with a `CandidateReferences` table if needed).
- A managed Roles lookup table with admin config (current approach is free-text + suggestions).
- Role column/filter on the candidates list (a `CandidateListItemDto.AppliedRole` field is added to enable it later).

## 4. Data model changes
Add flat fields to **`Candidate`** (`server/Recruitment.Gorilla.API/Models/Candidate.cs`):

| Field | Type | Max | Notes |
|---|---|---|---|
| GithubUrl | string? | 500 | nullable; auto-parsed from CV when present |
| PortfolioUrl | string? | 500 | nullable; manual |
| AppliedRole | string? | 150 | nullable; role being interviewed for; free-text w/ suggestions |
| IsReferred | bool | — | default `false` |
| ReferenceName | string? | 200 | required **iff** `IsReferred` |
| ReferenceEmail | string? | 200 | required **iff** `IsReferred` |
| ReferenceEmployeeId | string? | 100 | optional |

- Add max-length config for the new string columns in `Data/AppDbContext.cs` `OnModelCreating` (follow the existing `Candidate` block style; `IsReferred` needs no extra config).
- **Migration:** `dotnet ef migrations add AddCandidateProfileAndReferenceFields` then `dotnet ef database update` (stop the running API first — file lock). All new columns are nullable / have defaults, so it's a safe additive migration on existing rows.

## 5. API contract
Existing create/update endpoints carry the new fields; one new GET for role suggestions. All require auth (default-deny + `[Authorize]` already on the controller).

| Method | Route | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| POST | `/api/candidates` | ✓ | `CreateCandidateDto` (+7 fields) | `CandidateDetailDto` / 409 | also validates reference |
| PUT | `/api/candidates/{id}` | ✓ | `UpdateCandidateDto` (+7 fields) | `CandidateDetailDto` | now validates reference |
| GET | `/api/candidates/roles` | ✓ | — | `string[]` | distinct non-empty `AppliedRole`, A→Z |

**Validation (400 BadRequest) — on both create and update:** if `IsReferred` is true, `ReferenceName` and `ReferenceEmail` must be non-empty and `ReferenceEmail` must look like an email. Message e.g. `"A referred candidate requires a reference name and a valid reference email."`

DTO changes (`server/Recruitment.Gorilla.API/DTOs/CandidateDtos.cs`):
- `CVDraftDto`: add `string? GithubUrl` (parser-filled; portfolio/role/reference are manual and not part of the draft).
- `CreateCandidateDto` & `UpdateCandidateDto`: add `GithubUrl`, `PortfolioUrl`, `AppliedRole`, `IsReferred`, `ReferenceName`, `ReferenceEmail`, `ReferenceEmployeeId`.
- `CandidateDetailDto`: add the same seven fields.
- `CandidateListItemDto`: add `string? AppliedRole` (for a future list column/filter).

## 6. Backend design
`server/Recruitment.Gorilla.API/Services/CandidateService.cs`:
- Map the new fields in `CreateAsync`, `UpdateAsync`, and `MapToDetail` (and include `AppliedRole` in the `GetAllAsync` projection).
- Add `string? ValidateReference(bool isReferred, string? name, string? email)` (or accept the DTO) returning an error string or null — same pattern as `ValidateInitialStatusAsync`. Reuse for create and update. A simple email check (contains `@` and a `.` after it, or a small regex consistent with `CVParserService`) is sufficient.
- Add `Task<List<string>> GetDistinctRolesAsync()` → `db.Candidates.Where(c => c.AppliedRole != null && c.AppliedRole != "").Select(c => c.AppliedRole!).Distinct().OrderBy(r => r).ToListAsync()`.

`server/Recruitment.Gorilla.API/Controllers/CandidatesController.cs`:
- `Create`: after the initial-status check, run `ValidateReference` → `BadRequest` on failure.
- `Update`: add `ValidateReference` → `BadRequest` (it currently does no validation).
- New `GET roles` action → `Ok(await candidateService.GetDistinctRolesAsync())`.
- Keep the existing audit logging style.

`server/Recruitment.Gorilla.API/Services/CVParserService.cs` (+ `CVUploadController`):
- Extract GitHub the same way LinkedIn is done: regex `github\.com/[\w-]+` over the text, with a fallback to PDF hyperlink annotations. Add it to the parser's return and surface it in `CVDraftDto.GithubUrl` from `CVUploadController`.

## 7. Frontend design
`client/src/types/index.ts` (**camelCase**):
- `CVDraft`: add `githubUrl: string | null`.
- `CreateCandidatePayload`, `UpdateCandidatePayload`, `CandidateDetail`: add `githubUrl`, `portfolioUrl`, `appliedRole` (all `string | null`), `isReferred: boolean`, `referenceName`, `referenceEmail`, `referenceEmployeeId` (`string | null`).

`client/src/services/api.ts`:
- Add `getCandidateRoles = async (): Promise<string[]> => (await api.get<string[]>('/candidates/roles')).data;`

`client/src/components/CandidateForm.tsx` (upload review) and the `ProfileEditor` in `client/src/pages/CandidateDetailPage.tsx`:
- Add **GitHub URL** and **Portfolio Website** text inputs (GitHub prefilled from the draft on the upload form).
- **Applied role** = searchable/creatable dropdown using a native datalist (no new dependency):
  ```tsx
  const { data: roleOptions = [] } = useQuery({ queryKey: ['candidate-roles'], queryFn: getCandidateRoles });
  // ...
  <Form.Control list="role-options" value={appliedRole} onChange={e => setAppliedRole(e.target.value)} placeholder="e.g. Backend Engineer" />
  <datalist id="role-options">
    {roleOptions.map(r => <option key={r} value={r} />)}
  </datalist>
  ```
  Invalidate `['candidate-roles']` after a successful create/update so new roles appear in suggestions.
- **Reference section**: a `Form.Check` labelled "Candidate has been referred" bound to `isReferred`. When checked, reveal **Reference name \***, **Email address \***, **Employee ID**. Client-side guard mirroring the server: if `isReferred` and name/email blank (or email malformed), show the inline error and don't submit (same `setError(...)` pattern already used in `CandidateForm`).
- The detail page should also **display** the GitHub/Portfolio as links, the applied role, and the reference details (read view), consistent with the existing card/profile layout and theme.

## 8. Security & auth
All endpoints require auth (no `[AllowAnonymous]`). Validate/trim inputs server-side; the reference rule is enforced on the server (not just the client). No file or ownership concerns beyond the existing candidate scoping.

## 9. Acceptance criteria / verification
- [ ] `AddCandidateProfileAndReferenceFields` migration applies cleanly to the existing DB.
- [ ] `dotnet build` (API stopped first) and `npx tsc -b` both pass.
- [ ] Create/Update with **referred** checked but missing name or email → **400**; with both present → succeeds. Verified through the proxy (`http://localhost:5173/api/...`); unauthorized → 401.
- [ ] Role field suggests previously-used roles (datalist) **and** accepts a brand-new typed role; new role appears in suggestions after save.
- [ ] Uploading a CV that contains a `github.com/...` link prefills GitHub URL in the review form.
- [ ] Detail page shows and can edit all new fields; values persist after reload.
- [ ] Existing candidates (pre-migration) load fine with the new fields empty/false.
- [ ] Docs updated: `ai-docs/data-model.md` (new Candidate fields), `ai-docs/backend.md` (roles endpoint + reference validation), `ai-docs/frontend.md` (new form fields + `getCandidateRoles`).

## 10. Open questions
- Should `AppliedRole` later become a managed lookup (Roles table + admin), like `StatusOptions`? Current choice: free-text + suggestions.
- Should the candidates list show/ filter by role now? `CandidateListItemDto.AppliedRole` is added to make that a small follow-up.
- Reference email: is a light format check enough, or should it be strict/verified? Current choice: light shape check, consistent with `CVParserService`.
