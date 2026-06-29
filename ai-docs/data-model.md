# Data Model

Entities live in `server/Recruitment.Gorilla.API/Models/`; mapping/constraints are in `server/Recruitment.Gorilla.API/Data/AppDbContext.cs`. Database: MySQL `RecruitmentGorilla`.

## Entities & relationships
```
Candidate 1───* CVFile          (cascade delete)
Candidate 1───* StatusHistory   (cascade delete)
RefreshToken    (standalone; auth)
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
| Status | varchar(100) | required; free-form string in Phase 1 |
| Comment | text | nullable |
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

## Key design rules
- **Status is free-form text** in Phase 1 (a defined enum/lookup is a later phase). Keep it a string.
- **CurrentStatus is denormalized** — whenever you append a `StatusHistory`, update `Candidate.CurrentStatus` and `UpdatedAt` in the same save (see `CandidateService.AddStatusAsync`).
- **Cascade deletes** are configured for CVFiles and StatusHistories. Deleting a candidate also removes its physical CV files from disk (`CandidateService.DeleteAsync`).
- **Schema changes go through EF migrations** — never hand-edit the DB. See [backend.md](backend.md) and [feature-playbook.md](feature-playbook.md).
