# Spec — Candidate UX, Validation, Configuration, and CV Preview

**Status:** Implemented  
**Author:** Codex  
**Date:** 2026-06-29

> Implementation notes (decisions on §10 open questions): Role Applied and Skills are **optional**; the legacy free-text `AppliedRole`/`Skills` columns were **kept** (not migrated) for back-compat while the forms use the configured values; `CurrentTitle` stays separate from Role Applied; status colors are a frontend helper (not DB-configurable); CV preview reuses the existing authenticated CV endpoint as a blob (no new preview route); `.docx` shows a friendly unsupported-preview fallback. Migration: `AddCandidateConfigurationAndPreviewSupport`.

## 1. Summary
Improve candidate data entry and review by cleaning up login hints, adding frontend validation, refining status workflow behavior, adding status colors, introducing configurable Role Applied and Skills values, and previewing CVs inside the application.

## 2. Motivation
The current UI exposes exact credential hints on login, relies too much on backend validation feedback, uses non-configurable candidate role/skill fields, and requires admins to download CVs instead of reviewing them in context. These changes make the app safer, faster to use, and easier to configure for recruitment workflows.

## 3. Scope
**In scope:**
- Remove exact username/password hints from the login form.
- Add frontend validation for candidate forms, especially email format and required fields.
- Add/update transition `Uploaded -> Call for Interview`.
- Ensure `Call for Interview` has no prerequisite fields.
- Add status color mapping for list badges and timeline nodes/badges.
- Add database-backed, admin-manageable `Role Applied` options.
- Add database-backed, admin-manageable Skill options.
- Make `Role Applied` a searchable single-select dropdown using configured values only.
- Make Skills a searchable multi-select using configured values only.
- Add a configuration page to manage Role Applied and Skills values.
- Add in-app CV preview, at minimum for PDF files.

**Out of scope / later:**
- Multi-user permission model for configuration management.
- Bulk import/export of Role Applied or Skill values.
- AI-based skill normalization or synonym merging.
- Admin-configurable status colors.
- Full `.docx` visual rendering unless explicitly selected later.

## 4. Data model changes
Proposed migration name: `AddCandidateConfigurationAndPreviewSupport`.

### Candidate
Add:

| Field | Type | Notes |
|---|---|---|
| `RoleAppliedOptionId` | int? FK | selected configured role |

Decision needed during implementation: keep existing free-text role/skill fields for backward compatibility or migrate them into configured lookup values.

### RoleAppliedOption
New standalone lookup table:

| Field | Type | Notes |
|---|---|---|
| `Id` | int PK | auto |
| `Name` | varchar(200) | required, unique |
| `SortOrder` | int | dropdown order |
| `IsActive` | bool | inactive values hidden from candidate forms |
| `CreatedAt` | datetime | UTC |
| `UpdatedAt` | datetime | UTC |

### SkillOption
New standalone lookup table:

| Field | Type | Notes |
|---|---|---|
| `Id` | int PK | auto |
| `Name` | varchar(200) | required, unique |
| `SortOrder` | int | dropdown order |
| `IsActive` | bool | inactive values hidden from candidate forms |
| `CreatedAt` | datetime | UTC |
| `UpdatedAt` | datetime | UTC |

### CandidateSkill
New many-to-many join table:

| Field | Type | Notes |
|---|---|---|
| `CandidateId` | int FK → Candidate | cascade delete |
| `SkillOptionId` | int FK → SkillOption | restrict delete |

Indexes:
- Unique composite index on `(CandidateId, SkillOptionId)`.

### Status workflow
Add/seed transition:

```text
Uploaded -> Call for Interview
```

`Call for Interview` should not require extra prerequisite fields.

## 5. API contract
All endpoints require auth.

| Method | Route | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| `GET` | `/api/config/roles` | required | — | `RoleAppliedOptionDto[]` | Active role values ordered by sort/name. |
| `POST` | `/api/config/roles` | required | `UpsertRoleAppliedOptionDto` | `RoleAppliedOptionDto` | Create role value. |
| `PUT` | `/api/config/roles/{id}` | required | `UpsertRoleAppliedOptionDto` | `RoleAppliedOptionDto` | Update role value. |
| `DELETE` | `/api/config/roles/{id}` | required | — | `204` | Prefer soft-disable when in use. |
| `GET` | `/api/config/skills` | required | — | `SkillOptionDto[]` | Active skill values ordered by sort/name. |
| `POST` | `/api/config/skills` | required | `UpsertSkillOptionDto` | `SkillOptionDto` | Create skill value. |
| `PUT` | `/api/config/skills/{id}` | required | `UpsertSkillOptionDto` | `SkillOptionDto` | Update skill value. |
| `DELETE` | `/api/config/skills/{id}` | required | — | `204` | Prefer soft-disable when in use. |
| `GET` | `/api/candidates/{id}/cv/{fileId}/preview` | required | — | file/blob or preview DTO | Preview CV inside app. |

Update existing candidate DTOs:
- `CreateCandidateDto`: include `RoleAppliedOptionId` and `SkillOptionIds`.
- `UpdateCandidateDto`: include `RoleAppliedOptionId` and `SkillOptionIds`.
- `CandidateDetailDto`: include selected role option and selected skills.
- `CandidateListItemDto`: include role applied display name if shown in the list.

Status codes:
- `400 Bad Request` for invalid email, missing required fields, invalid role/skill IDs, or invalid status transitions/prerequisites.
- `404 NotFound` for missing candidate, config option, or file.
- `409 Conflict` for duplicate config option names.

## 6. Backend design
- Add a configuration service/controller, e.g. `ConfigurationService` and `ConfigurationController`, or focused `RoleAppliedOptionService` and `SkillOptionService`.
- Keep controllers thin; all EF access stays in services.
- Validate candidate create/update:
  - `FullName` required.
  - `Email` required and valid.
  - `RoleAppliedOptionId` exists and is active when provided/required.
  - all `SkillOptionIds` exist and are active.
- Keep backend validation as a safety net even when frontend validation blocks invalid submits.
- Update `CandidateService` mappings for configured role and skills.
- Update status workflow seed to include `Uploaded -> Call for Interview`.
- For CV preview:
  - PDF: return an authenticated stream/blob suitable for inline preview.
  - `.docx`: show extracted text preview or a clear unsupported-preview fallback unless full rendering is explicitly chosen.
- Log configuration writes with `ILogger`.

## 7. Frontend design
### Login
- Remove placeholders/default text that reveal exact credentials.
- Do not prefill username or password from application state.
- Keep generic labels: `Username`, `Password`.

### Candidate forms
- Add frontend validation before submit:
  - full name required,
  - email required,
  - email format valid,
  - role required if business decides it is mandatory,
  - status prerequisite fields required when applicable.
- Show inline validation messages near fields.
- Keep backend error display for safety-net errors.

### Configuration page
- Add route `/configuration`.
- Add navbar link `Configuration`.
- Page sections:
  - Role Applied values,
  - Skill values.
- Each section supports add, edit, activate/deactivate.
- Use React Bootstrap forms/tables/modals and the existing Fluent theme.
- Query keys:
  - `['config', 'roles']`
  - `['config', 'skills']`

### Searchable dropdowns
- Candidate forms must not create new role/skill values.
- Role Applied: searchable single-select dropdown from configured values.
- Skills: searchable multi-select from configured values, rendering selected values as removable badges.
- If no new package is desired, implement a small Bootstrap-compatible searchable select component.

### Status colors
Add a frontend helper such as `getStatusVariant(status)` or `getStatusClass(status)`.

Suggested mapping:

| Status | Visual |
|---|---|
| `Reject` | red / danger |
| `Not Recommended` | red / danger |
| `Discontinued` | red / danger |
| `Recommended` | green / success |
| `Call for Interview` | blue / primary |
| `Interview Scheduled` | blue / primary |
| `Interview Completed` | blue / primary |
| `Technical Assessment` | purple/info |
| `Submission Receieved` | purple/info |
| `Code Review` | purple/info |
| `No Submission` | gray / secondary |
| `Not Available` | gray / secondary |
| `Uploaded` | neutral |
| `Ask for Assesment` | neutral |

Apply colors to candidate list status badges, candidate detail status display, and timeline nodes/badges.

### CV preview
- Candidate detail page should show a preview card/panel near CV files.
- Clicking a CV file loads preview inside the app.
- PDF preview should fetch through the authenticated `api` instance as a blob, create an object URL, and render it in an iframe/object.
- Revoke object URLs on cleanup.
- Unsupported preview types show a friendly fallback and keep the download button.

## 8. Security & auth
- All configuration and preview endpoints remain protected by default-deny auth.
- Do not expose the backend to the network; continue using same-origin `/api`.
- Do not show default credentials in the UI.
- Frontend validation improves UX, but backend validation remains mandatory.
- File preview must use authenticated API calls and blob URLs to avoid unauthenticated file exposure.

## 9. Acceptance criteria / verification
- [ ] Login page no longer shows `admin` or any exact password/default credential hint in text boxes.
- [ ] Login fields are not prefilled by application state.
- [ ] Candidate create/update blocks invalid email on the frontend with a clear message.
- [ ] Candidate create/update blocks missing required fields on the frontend.
- [ ] `Call for Interview` appears as a valid next status directly from `Uploaded`.
- [ ] Selecting `Call for Interview` shows no prerequisite fields.
- [ ] Invalid next statuses remain hidden from the status dropdown.
- [ ] Reject/Not Recommended/Discontinued display red styling.
- [ ] Recommended displays green styling.
- [ ] Candidate list and timeline both use status colors.
- [ ] Configuration page can add/edit/deactivate Role Applied values.
- [ ] Candidate forms use Role Applied values from configuration only.
- [ ] Role Applied dropdown is searchable and not creatable from the candidate form.
- [ ] Configuration page can add/edit/deactivate Skill values.
- [ ] Candidate forms support multiple configured skills.
- [ ] Skills picker is searchable and not creatable from the candidate form.
- [ ] Candidate detail can preview PDF CVs inside the app via authenticated blob fetch.
- [ ] Unsupported CV preview types show a friendly fallback and still allow download.
- [ ] `dotnet build` passes.
- [ ] `dotnet ef database update` applies cleanly.
- [ ] `npx tsc -b` passes.
- [ ] Docs in `ai-docs/` are updated.

## 10. Open questions
- Should `Role Applied` be mandatory for every candidate?
- Should Skills be mandatory?
- Should existing free-text skills be migrated into `SkillOptions`, and if yes, should comma/newline splitting be used?
- Should existing `CurrentTitle` stay separate from `Role Applied`, or should Role Applied replace it?
- Should status colors eventually be configurable from the database?
- For `.docx` CV preview, is extracted text preview acceptable, or is full visual document rendering required?
