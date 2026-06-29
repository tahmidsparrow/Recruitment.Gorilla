# Implementation Prompt — Candidate UX, Validation, Configuration, and CV Preview

Use this prompt to implement [`candidate-ux-validation-config-and-preview.md`](candidate-ux-validation-config-and-preview.md).

```text
You are working in the Recruitment Gorilla repo.

Read first:
- AGENTS.md
- ai-docs/README.md
- ai-docs/conventions.md
- ai-docs/feature-playbook.md
- ai-docs/specs/candidate-ux-validation-config-and-preview.md

Implement the Candidate UX, Validation, Configuration, and CV Preview feature in the existing project style.

Required changes:
1. Clean up LoginPage so username/password inputs do not reveal exact default credentials and are not application-prefilled.
2. Add frontend validation to candidate create/update forms for required fields and email format.
3. Update status workflow so `Uploaded -> Call for Interview` is allowed.
4. Ensure `Call for Interview` has no prerequisite fields.
5. Add status color mapping and apply it to candidate list badges and timeline UI.
6. Add database-backed Role Applied options with authenticated CRUD/config endpoints.
7. Add database-backed Skill options with authenticated CRUD/config endpoints.
8. Add a Configuration page to manage Role Applied and Skills values.
9. Candidate forms must use a searchable single-select Role Applied dropdown from configured values only.
10. Candidate forms must use a searchable multi-select Skills picker from configured values only.
11. Candidate forms must not allow creating new Role/Skill values.
12. Add in-app CV preview on candidate detail, using authenticated blob fetch for PDFs.
13. For unsupported preview types, show a friendly message and keep download available.

Implementation constraints:
- Follow Controller → Service → AppDbContext.
- Keep controllers thin.
- Put DTO records in server/Recruitment.Gorilla.API/DTOs/.
- Put HTTP functions only in client/src/services/api.ts.
- Put shared frontend types in client/src/types/index.ts.
- Use TanStack Query with stable query keys.
- Use React Bootstrap and existing Fluent theme.
- Do not expose the backend to the network.
- Add EF migrations for schema changes.
- Update relevant docs in ai-docs/.

Verification:
- dotnet build
- dotnet ef database update
- npx tsc -b
- Manual browser check for login, candidate validation, status transition, config page, searchable dropdowns, multi-skill selection, and CV preview.
```
