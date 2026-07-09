## Summary
<!-- What does this PR do and why? 1–3 sentences. -->

## Related spec / issue
<!-- Link the ai-docs/specs/*.md spec (write one first for non-trivial features)
     and any issue. e.g. Spec: ai-docs/specs/<feature>.md — Closes #123 -->

## Type of change
- [ ] Feature
- [ ] Fix
- [ ] Refactor / tech debt
- [ ] Docs (ai-docs / README)
- [ ] Chore / tooling

## Changes
<!-- Bullet the notable changes, grouped where helpful. -->
- Backend:
- Frontend:
- Database:

## Database & migrations
- [ ] No schema change, **or**
- [ ] Adds EF migration `______` (committed); `dotnet ef database update` applies cleanly
- [ ] Migration reviewed — no unintended `DropColumn` / data loss

## API changes
<!-- New/changed endpoints. "None" if not applicable. -->
| Method | Route | Auth | Notes |
|---|---|---|---|
| | | | |

## How to test
<!-- Steps a reviewer can follow. Test THROUGH the proxy (http://localhost:5173/api/...). -->
1.
2.

## Screenshots / recording
<!-- For UI changes: before/after, and light + dark mode. -->

## Verification checklist
- [ ] `dotnet build` (API stopped first) — 0 errors
- [ ] `npx tsc -b` and `npm run lint` in `client/` — clean
- [ ] Migration applies cleanly (or N/A)
- [ ] Tested through the proxy: unauthorized → 401; happy path; not-found / validation paths
- [ ] UI works end-to-end signed in; lists refresh after writes; destructive actions confirm
- [ ] Works in **both light and dark** themes (UI changes)
- [ ] Audit log lines appear in `Logs/` for writes (or N/A)
- [ ] `ai-docs/` updated to match the change (data-model / backend / frontend / spec)

## Golden-rule compliance
- [ ] No secrets in source (connection string, `Jwt:Key`, `Auth:PasswordHash` stay in user secrets)
- [ ] Backend not exposed to the network (`baseURL = '/api'`, backend on localhost)
- [ ] No Claude/Anthropic (or any AI) as commit author/co-author
- [ ] Followed the existing layered pattern (Entity → DbContext → migration → DTO → Service → Controller → api.ts → types → Query/UI)

## Notes for reviewer
<!-- Trade-offs, follow-ups, anything out of scope. -->
