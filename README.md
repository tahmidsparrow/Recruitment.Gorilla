# Recruitment.Gorilla

A recruitment management system for streamlining CV ingestion, candidate tracking, and hiring pipeline management.

---

## Phase 1 Features

- **Bulk CV Upload** — drag-and-drop multiple PDF or Word (.docx) files at once
- **Auto-extraction** — name, email, phone, job title, LinkedIn, and skills are parsed directly from the CV
- **Admin Review** — extracted data is presented as an editable form before saving
- **Status Tracking** — assign a status to each candidate at any point in the pipeline
- **Status History** — every status change is recorded with a timestamp and admin comment
- **Timeline View** — per-candidate visual flowchart showing the full status history

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | ASP.NET Core Web API (.NET 10) |
| ORM | Entity Framework Core 9 + Pomelo MySQL provider |
| Database | MySQL |
| Frontend | React 18 + TypeScript (Vite) |
| UI | Bootstrap 5 + React Bootstrap |
| Data Fetching | TanStack Query v5 + Axios |
| File Upload UX | react-dropzone |
| CV Parsing | PdfPig (PDF), DocumentFormat.OpenXml (Word) |
| File Storage | Local disk (`server/Recruitment.Gorilla.API/Uploads/`) |

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [MySQL 8+](https://dev.mysql.com/downloads/)
- [dotnet-ef CLI tool](https://learn.microsoft.com/en-us/ef/core/cli/dotnet)

Install the EF CLI tool globally if not already installed:

```bash
dotnet tool install --global dotnet-ef
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd Recruitment.Gorilla
```

### 2. Configure the database connection

Edit `server/Recruitment.Gorilla.API/appsettings.json` and set your MySQL credentials:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Database=RecruitmentGorilla;User=root;Password=yourpassword;"
  }
}
```

### 3. Run database migrations

```bash
cd server/Recruitment.Gorilla.API
dotnet ef database update
```

### 4. Start the backend API

```bash
cd server/Recruitment.Gorilla.API
dotnet run
```

The API will be available at `http://localhost:5000`.

### 5. Start the frontend

```bash
cd client
npm install
npm run dev
```

The React app will be available at `http://localhost:5173`.

---

## Project Structure

```
Recruitment.Gorilla/
├── PROJECT_PLAN.md              # Architecture decisions and build order
├── README.md                    # This file
├── .gitignore
│
├── client/                      # React + TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── BulkUploader.tsx     # Drag-and-drop CV upload zone
│   │   │   ├── CandidateForm.tsx    # Editable candidate profile form
│   │   │   └── StatusTimeline.tsx   # Vertical status history flowchart
│   │   ├── pages/
│   │   │   ├── UploadPage.tsx
│   │   │   ├── CandidatesPage.tsx
│   │   │   └── CandidateDetailPage.tsx
│   │   ├── services/
│   │   │   └── api.ts               # Axios instance + typed API calls
│   │   └── types/
│   │       └── index.ts             # Shared TypeScript types
│   ├── package.json
│   └── vite.config.ts
│
└── server/
    ├── Recruitment.Gorilla.sln
    └── Recruitment.Gorilla.API/
        ├── Controllers/
        │   ├── CandidatesController.cs
        │   └── CVUploadController.cs
        ├── Models/              # EF Core entities
        │   ├── Candidate.cs
        │   ├── CVFile.cs
        │   └── StatusHistory.cs
        ├── DTOs/                # Request / response shapes
        ├── Services/
        │   ├── CVParserService.cs   # PDF + Word text extraction
        │   └── CandidateService.cs
        ├── Data/
        │   └── AppDbContext.cs
        ├── Uploads/             # CV files stored here (not tracked in git)
        └── Program.cs
```

---

## Database Schema

### Candidates
| Column | Type | Notes |
|---|---|---|
| Id | int PK | Auto-increment |
| FullName | varchar(200) | |
| Email | varchar(200) | |
| Phone | varchar(50) | Nullable |
| CurrentTitle | varchar(200) | Nullable |
| Skills | text | Nullable |
| Summary | text | Nullable |
| LinkedInUrl | varchar(500) | Nullable |
| CurrentStatus | varchar(100) | Denormalised last-known status |
| CreatedAt | datetime | |
| UpdatedAt | datetime | |

### CVFiles
| Column | Type | Notes |
|---|---|---|
| Id | int PK | Auto-increment |
| CandidateId | int FK | → Candidates |
| OriginalFileName | varchar(500) | As uploaded |
| StoredFileName | varchar(500) | GUID-based, collision-safe |
| FileType | varchar(10) | `PDF` or `Word` |
| FileSizeBytes | bigint | |
| UploadedAt | datetime | |

### StatusHistory
| Column | Type | Notes |
|---|---|---|
| Id | int PK | Auto-increment |
| CandidateId | int FK | → Candidates |
| Status | varchar(100) | Free-form string (Phase 1) |
| Comment | text | Nullable — admin note |
| ChangedAt | datetime | |
| ChangedBy | varchar(200) | Admin name or email |

---

## API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/cvupload` | Upload CV file, returns extracted candidate draft |
| `GET` | `/api/candidates` | List all candidates (paged, searchable) |
| `POST` | `/api/candidates` | Save a new candidate (409 + existing record if email already exists; resend with `allowDuplicate: true` to override) |
| `GET` | `/api/candidates/{id}` | Get candidate detail + status history |
| `PUT` | `/api/candidates/{id}` | Update candidate profile |
| `POST` | `/api/candidates/{id}/status` | Add a status change with comment |
| `GET` | `/api/candidates/{id}/cv/{fileId}` | Stream/download the original stored CV file |

---

## CV Parsing

Text is extracted from uploaded files and parsed using regex patterns:

| Field | Strategy |
|---|---|
| Name | First non-empty line of the document |
| Email | Regex: `[\w.+-]+@[\w-]+\.[a-z]{2,}` |
| Phone | Regex: `(\+?\d[\d\s\-().]{7,}\d)` |
| LinkedIn | Regex: `linkedin\.com/in/[\w-]+` |
| Skills | Text block following a "Skills" heading |

All extracted values are editable before the candidate record is saved.

---

## Development Notes

- EF Core packages are pinned to **9.0.0** to stay within Pomelo 9.x's compatibility window (`>= 9.0.0 && <= 9.0.999`)
- Uploaded files are stored as `{GUID}{.pdf|.docx}` — the original filename is preserved in the database
- Status values are free-form strings in Phase 1; a defined status lookup table will be introduced in a later phase
- The `Uploads/` directory is excluded from git via `.gitignore`

---

## Roadmap

- **Phase 2** — Defined status workflow, role-based access (admin vs. recruiter), email notifications
- **Phase 3** — Interview scheduling, offer management, reporting dashboard
