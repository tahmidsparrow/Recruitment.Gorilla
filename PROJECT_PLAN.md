# Recruitment.Gorilla — Project Plan

## Overview
Recruitment Management System built to streamline CV ingestion, candidate tracking, and status management for admin users.

---

## Phase 1 Scope
- Bulk CV upload (PDF and Word files)
- Auto-extract candidate info from CV + admin review/edit
- Status tracking per candidate (statuses TBD)
- Status history stored as append-only log
- Linear timeline (flowchart) showing status history with comments

---

## Tech Stack

| Layer | Choice |
|---|---|
| Backend | ASP.NET Core Web API (.NET 10) |
| Frontend | React 18 + TypeScript (Vite) |
| Database | MySQL via Pomelo.EntityFrameworkCore.MySql 9.0.0 |
| File Storage | Local disk (`server/Recruitment.Gorilla.API/Uploads/`) |
| CV Parsing | PdfPig (PDF) + DocumentFormat.OpenXml (Word) |
| UI | Bootstrap 5 + React Bootstrap |
| Data Fetching | TanStack Query v5 + Axios |
| File Upload UX | react-dropzone |

---

## Project Structure (Monorepo)

```
Recruitment.Gorilla/
├── PROJECT_PLAN.md
├── client/                          # React + TypeScript (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CandidateForm.tsx    # Editable candidate info
│   │   │   ├── StatusTimeline.tsx   # Linear flowchart component
│   │   │   └── BulkUploader.tsx     # Drag-and-drop upload zone
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx
│   │   │   ├── CandidatesPage.tsx
│   │   │   └── CandidateDetailPage.tsx
│   │   ├── services/api.ts
│   │   └── types/index.ts
│   ├── package.json
│   └── vite.config.ts
│
└── server/
    ├── Recruitment.Gorilla.sln
    └── Recruitment.Gorilla.API/
        ├── Controllers/
        │   ├── CandidatesController.cs
        │   └── CVUploadController.cs
        ├── Models/
        │   ├── Candidate.cs
        │   ├── CVFile.cs
        │   └── StatusHistory.cs
        ├── DTOs/
        ├── Services/
        │   ├── CVParserService.cs
        │   └── CandidateService.cs
        ├── Data/
        │   └── AppDbContext.cs
        ├── Uploads/
        └── Program.cs
```

---

## Database Schema

### `Candidates`
| Column | Type | Notes |
|---|---|---|
| Id | int PK auto | |
| FullName | varchar(200) | |
| Email | varchar(200) | |
| Phone | varchar(50) | nullable |
| CurrentTitle | varchar(200) | nullable |
| Skills | text | nullable |
| Summary | text | nullable |
| LinkedInUrl | varchar(500) | nullable |
| CurrentStatus | varchar(100) | denormalised — last known status |
| CreatedAt | datetime | |
| UpdatedAt | datetime | |

### `CVFiles`
| Column | Type | Notes |
|---|---|---|
| Id | int PK auto | |
| CandidateId | int FK | → Candidates |
| OriginalFileName | varchar(500) | |
| StoredFileName | varchar(500) | GUID-based |
| FileType | varchar(10) | "PDF" or "Word" |
| FileSizeBytes | bigint | |
| UploadedAt | datetime | |

### `StatusHistory`
| Column | Type | Notes |
|---|---|---|
| Id | int PK auto | |
| CandidateId | int FK | → Candidates |
| Status | varchar(100) | flexible string; enum to be defined later |
| Comment | text | nullable |
| ChangedAt | datetime | |
| ChangedBy | varchar(200) | admin name/email |

---

## Key Flows

### 1 — Bulk Upload
1. Admin drops multiple PDF/Word files onto the upload zone
2. Each file is sent to `POST /api/cvupload`
3. API saves file to `Uploads/{GUID}{ext}`, records `CVFile`
4. `CVParserService` extracts text → regex pulls name, email, phone, title, skills
5. Returns extracted draft to frontend for admin review
6. Admin corrects and submits → `POST /api/candidates` saves candidate + first `StatusHistory` entry

### 2 — Candidate List
- `GET /api/candidates` — paged list with current status, searchable by name/email/status

### 3 — Status Change
- `POST /api/candidates/{id}/status` — appends `StatusHistory` row, updates `CurrentStatus`

### 4 — Status Timeline
- Frontend renders a vertical chain of status nodes (newest on top)
- Each node: status label · date · admin comment
- Pure CSS/Bootstrap — no external graph library

---

## NuGet Packages
| Package | Version | Purpose |
|---|---|---|
| Pomelo.EntityFrameworkCore.MySql | 9.0.0 | MySQL EF Core provider |
| Microsoft.EntityFrameworkCore.Design | 9.0.0 | Migrations tooling |
| Microsoft.EntityFrameworkCore.Tools | 9.0.0 | `dotnet ef` CLI |
| PdfPig | 0.1.15 | PDF text extraction |
| DocumentFormat.OpenXml | 3.5.1 | Word .docx parsing |

## NPM Packages
| Package | Purpose |
|---|---|
| react, react-dom, typescript, vite | Core frontend |
| @tanstack/react-query | Data fetching & caching |
| axios | HTTP client |
| react-dropzone | Drag-and-drop file upload |
| bootstrap, react-bootstrap | Styling & UI components |
| react-router-dom | Client-side routing |

---

## Build Order

| # | Task | Status |
|---|---|---|
| 1 | Scaffold monorepo — dotnet webapi + Vite React | ✅ Done |
| 2 | Pin NuGet packages, resolve EF Core / Pomelo version conflict | ✅ Done |
| 3 | Define EF Core entities, AppDbContext, initial MySQL migration | ⬜ Next |
| 4 | Build CV upload API (save file, parse, return draft) | ⬜ Pending |
| 5 | Build Candidates CRUD API + status-change endpoint | ⬜ Pending |
| 6 | Set up React shell (Bootstrap, TanStack Query, routing) | ⬜ Pending |
| 7 | Build Upload page (BulkUploader + CandidateForm) | ⬜ Pending |
| 8 | Build Candidates list page (table, search, filter) | ⬜ Pending |
| 9 | Build Candidate detail page (profile editor + StatusTimeline) | ⬜ Pending |

---

## Notes
- EF Core packages pinned to **9.0.0** to match Pomelo 9.0.0 compatibility window (Pomelo requires EF Relational >= 9.0 && <= 9.0.999)
- MySQL connection string goes in `appsettings.json` under `ConnectionStrings:DefaultConnection`
- Status values are free-form strings for Phase 1; a defined enum/lookup table will be added in a later phase
- CV file collision prevention: files are stored as `{GUID}{original-extension}`, original name preserved in DB