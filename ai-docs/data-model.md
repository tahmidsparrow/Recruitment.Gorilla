# Data Model

Entities live in `server/Recruitment.Gorilla.API/Models/`; mapping/constraints are in `server/Recruitment.Gorilla.API/Data/AppDbContext.cs`. Database: MySQL `RecruitmentGorilla`.

## Entities & relationships
```
Candidate 1───* CVFile          (cascade delete)
Candidate 1───* StatusHistory   (cascade delete)
RefreshToken    (standalone; auth)
StatusOption    (standalone lookup)
StatusOption 1───* StatusTransition (from/to lookup)
```

### Candidate (`Candidates`)
The core profile. Holds a **denormalized `CurrentStatus`** for fast list queries, while the full history lives in `StatusHistory`.

| Field | Type | Notes |
|---|---|---|
| Id | int PK | auto |
| FullName | varchar(200) | required |
| Email | varchar(200) | required; used for duplicate detection |
| Phone | varchar(50) | nullable |
| CurrentTitle | varchar(200) | nullable |
| Skills | text | nullable |
| Summary | text | nullable |
| LinkedInUrl | varchar(500) | nullable |
| CurrentStatus | varchar(100) | required; mirrors latest StatusHistory.Status |
| CreatedAt / UpdatedAt | datetime | UTC |

### CVFile (`CVFiles`)
One row per uploaded file. The physical file is on disk under `Uploads/` as `{GUID}{ext}`; the DB keeps the mapping and original name.

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| CandidateId | int FK → Candidate | cascade delete |
| OriginalFileName | varchar(500) | as uploaded |
| StoredFileName | varchar(500) | `{GUID}.pdf`/`.docx` on disk |
| FileType | varchar(10) | `"PDF"` or `"Word"` |
| FileSizeBytes | bigint | |
| UploadedAt | datetime | |

### StatusHistory (`StatusHistories`)
**Append-only** audit log of status changes; never updated/deleted (except via candidate cascade). The timeline UI reads this newest-first.

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| CandidateId | int FK → Candidate | cascade delete |
| Status | varchar(100) | required; selected from active workflow options when appended |
| Comment | text | nullable |
| TaskDetails | varchar(1000) | nullable; used for Technical Assessment |
| SubmissionUrl | varchar(1000) | nullable; used for Submission Receieved |
| InterviewAt | datetime | nullable; used for Interview Scheduled |
| ChangedAt | datetime | |
| ChangedBy | varchar(200) | required; admin name/email |

### RefreshToken (`RefreshTokens`)
Server-side store for auth refresh tokens (rotation + revocation). Only the **SHA-256 hash** of the opaque token is stored. See [auth.md](auth.md).

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| TokenHash | varchar(100) | unique index; SHA-256(token) base64 |
| Username | varchar(200) | |
| ExpiresAt / CreatedAt | datetime | |
| RevokedAt | datetime? | set on rotation or logout |
| ReplacedByTokenHash | varchar(100)? | rotation audit trail |
| IsActive | (computed) | `RevokedAt == null && now < ExpiresAt`; `[NotMapped]` via `Ignore` |

### StatusOption (`StatusOptions`)
Lookup table for candidate status dropdown values. Candidate and history rows still store the status text so historical labels remain readable even if configuration changes later.

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| Name | varchar(100) | required; unique |
| SortOrder | int | dropdown order |
| IsInitial | bool | allowed as an initial upload/review status |
| IsActive | bool | inactive options are hidden from dropdowns |
| CreatedAt | datetime | UTC |

### StatusTransition (`StatusTransitions`)
Lookup table for allowed movement from one status option to another. The UI hides statuses that are not valid next steps, and the API enforces the same rule.

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| FromStatusOptionId | int FK → StatusOption | required |
| ToStatusOptionId | int FK → StatusOption | required |
| SortOrder | int | next-status dropdown order |
| IsActive | bool | inactive transitions are hidden/blocked |

## Key design rules
- **Status choices come from `StatusOptions`** and valid next steps come from `StatusTransitions`. Keep `Candidate.CurrentStatus` and `StatusHistory.Status` as strings for readable history and low-risk future edits.
- **CurrentStatus is denormalized** — whenever you append a `StatusHistory`, update `Candidate.CurrentStatus` and `UpdatedAt` in the same save (see `CandidateService.AddStatusAsync`).
- **Prerequisites are enforced by the API** for status changes: task/comment for Technical Assessment, submission link for Submission Receieved, interview date/time for Interview Scheduled, comment for Interview Completed/Reject/Discontinued, and required prior statuses for Code Review/Recommended.
- **Cascade deletes** are configured for CVFiles and StatusHistories. Deleting a candidate also removes its physical CV files from disk (`CandidateService.DeleteAsync`).
- **Schema changes go through EF migrations** — never hand-edit the DB. See [backend.md](backend.md) and [feature-playbook.md](feature-playbook.md).
