# Database-Backed Status Options

**Status:** Implemented

## Summary
Replace free-text status entry points with dropdowns populated from a database lookup table, so future admin configuration can edit/add statuses without changing candidate/history storage.

## Goals
- Store candidate status options in MySQL.
- Seed the requested initial options in a migration.
- Expose active status options through an authenticated API endpoint.
- Use those options in upload review, candidate detail status changes, and candidate list filtering.
- Validate create/status-change requests against active configured options.

## Non-goals
- Admin UI for editing options.
- Transition-rule enforcement.
- Backfilling existing `Uploaded` candidate statuses.

## Data model
New standalone `StatusOption` entity/table:
- `Id`
- `Name`
- `SortOrder`
- `IsInitial`
- `IsActive`
- `CreatedAt`

New standalone `StatusTransition` entity/table:
- `Id`
- `FromStatusOptionId`
- `ToStatusOptionId`
- `SortOrder`
- `IsActive`

`Candidate.CurrentStatus` and `StatusHistory.Status` remain strings to preserve readable history if option labels are edited later.

`StatusHistory` stores prerequisite details where needed:
- `TaskDetails`
- `SubmissionUrl`
- `InterviewAt`

## API
| Method | Route | Auth | Response |
|---|---|---|---|
| `GET` | `/api/status-options` | required | `StatusOptionDto[]` active options ordered by `SortOrder`, then `Name` |
| `GET` | `/api/status-options/initial` | required | active initial options |
| `GET` | `/api/status-options/next/{candidateId}` | required | active next options allowed by transition rules |

`POST /api/candidates` and `POST /api/candidates/{id}/status` return `400 Bad Request` if the requested status is not configured/allowed or prerequisites are missing.

## Seeded options
- Reject
- Call for Interview
- Interview Scheduled
- Not Available
- Technical Assessment
- Submission Receieved
- Code Review
- Interview Completed
- Recommended
- No Submission
- Not Recommended
- Discontinued
- Uploaded
- Ask for Assesment

## Future workflow note
Fixed flow rules are implemented as transition rows layered on top of `StatusOptions`, rather than changing candidate history rows. The current bridge from `Uploaded` to `Ask for Assesment`/terminal statuses is inferred because `Uploaded` is allowed as an initial status in `status.md` but no outgoing transition was specified.
