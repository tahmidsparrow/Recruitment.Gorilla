# Spec Template

Copy this into [`specs/`](specs/) as `specs/<feature-name>.md` and fill it in before building. Delete guidance in parentheses. Keep it concise but complete enough that another agent can implement it without guessing.

---

# Spec — <Feature Name>

**Status:** Draft | Approved | Implemented
**Author:** <name/agent>
**Date:** <YYYY-MM-DD>

## 1. Summary
(One or two sentences: what this feature does and who it's for.)

## 2. Motivation
(Why we need it; the problem it solves.)

## 3. Scope
**In scope:** (bullets)
**Out of scope / later:** (bullets)

## 4. Data model changes
(New/changed entities and fields, types, nullability, relationships, cascade, indexes. "None" if no DB change. Note the migration name.)

## 5. API contract
(For each endpoint: method, route, auth, request DTO, response DTO, status codes incl. error cases. Mirror existing DTO/HTTP conventions.)

| Method | Route | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| | | | | | |

## 6. Backend design
(Which service/method holds the logic; key rules; logging; how it maps to existing patterns.)

## 7. Frontend design
(Types to add in `types/index.ts`; `api.ts` function(s); pages/components touched; Query keys to read/invalidate; UX incl. confirm modals; theme notes.)

## 8. Security & auth
(Any `[Authorize]`/`[AllowAnonymous]` specifics, ownership checks, input validation, file handling. Default-deny already applies.)

## 9. Acceptance criteria / verification
(Concrete, testable outcomes. Reuse the checklist in [feature-playbook.md](feature-playbook.md).)
- [ ] …

## 10. Open questions
(Anything needing a decision before/while building.)
