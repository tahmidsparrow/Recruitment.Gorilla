# Recruitment.Gorilla

A recruitment management system for streamlining CV ingestion, candidate tracking, and hiring pipeline management.

---

## Phase 1 Features

- **Admin Login** — the app is gated behind a single admin account (JWT auth with refresh-token rotation)
- **Bulk CV Upload** — drag-and-drop multiple PDF or Word (.docx) files at once
- **Auto-extraction** — name, email, phone, job title, LinkedIn, GitHub, and skills are parsed directly from the CV
- **Admin Review** — extracted data is presented as an editable form before saving
- **Rich Candidate Profile** — GitHub & portfolio links, plus a configurable Role Applied (searchable single-select) and Skills (searchable multi-select)
- **Reference Section** — record a referrer (name, email, employee id) behind a "has been referred" toggle; name + email required when referred
- **Configuration Page** — admin-manage Role Applied and Skill values (add / edit / activate)
- **Status Colors** — colour-coded status badges across the list, detail, and timeline
- **In-app CV Preview** — preview PDF CVs inside the app (authenticated); download fallback for other types
- **Form Validation** — required fields and email format are validated client-side (backend stays authoritative)
- **Duplicate Detection** — warns when a candidate with the same email already exists (save-anyway override)
- **Status Tracking** — assign a status to each candidate at any point in the pipeline
- **Status History** — every status change is recorded with a timestamp and admin comment
- **Timeline View** — per-candidate vertical timeline of the full status history (newest first)
- **CV Download** — stream/download the original stored CV file
- **Delete** — remove a candidate (and their files + history) with confirmation
- **Modern UI** — Microsoft Fluent-inspired theme (responsive)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend API | ASP.NET Core Web API (.NET 10) |
| ORM | Entity Framework Core 9 + Pomelo MySQL provider (pinned 9.0.0) |
| Database | MySQL |
| Auth | JWT bearer (access token) + rotating refresh token in httpOnly cookie |
| Logging | log4net (console + daily rolling file) |
| Frontend | React 19 + TypeScript (Vite) |
| UI | Bootstrap 5 + React Bootstrap, Microsoft Fluent theme |
| Data Fetching | TanStack Query v5 + Axios |
| File Upload UX | react-dropzone |
| CV Parsing | PdfPig (PDF), DocumentFormat.OpenXml (Word) |
| File Storage | Local disk (`server/Recruitment.Gorilla.API/Uploads/`) |

---

## Prerequisites

- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/)
- [MySQL 8+](https://dev.mysql.com/downloads/)
- `dotnet-ef` CLI, pinned to match the EF packages:

```bash
dotnet tool install --global dotnet-ef --version 9.0.0
```

---

## Getting Started

### 1. Clone the repository

```bash
git clone <repo-url>
cd Recruitment.Gorilla
```

### 2. Configure secrets (per machine, not committed)

The connection string, JWT signing key, and admin password hash live in [.NET user secrets](https://learn.microsoft.com/aspnet/core/security/app-secrets), never in `appsettings.json`. Run from the API project folder:

```bash
cd server/Recruitment.Gorilla.API

# MySQL connection (the RecruitmentGorilla DB doesn't need to exist yet)
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=RecruitmentGorilla;User=root;Password=yourpassword;"

# JWT signing key (must be >= 32 bytes)
dotnet user-secrets set "Jwt:Key" "<random base64 key>"

# Admin password hash (PBKDF2) — default login is admin / admin
dotnet user-secrets set "Auth:PasswordHash" "<pbkdf2 hash>"
```

See [ai-docs/dev-setup.md](ai-docs/dev-setup.md) for one-liners that generate the key and password hash. Secrets load only in the **Development** environment; the API fails fast on startup if a required secret is missing.

### 3. Run database migrations

```bash
cd server/Recruitment.Gorilla.API
dotnet ef database update
```

### 4. Start the backend API

```bash
cd server/Recruitment.Gorilla.API
$env:ASPNETCORE_ENVIRONMENT="Development"
dotnet run --urls http://localhost:5000
```

The API listens on `http://localhost:5000` (localhost only — it is not exposed to the network). Swagger: `http://localhost:5000/swagger`.

### 5. Start the frontend

```bash
cd client
npm install
npm run dev
```

The app is at `http://localhost:5173` and proxies `/api` to the backend. **Log in with `admin` / `admin`.**

### Access from another machine on the same network

Other machines on the LAN use the **frontend only** (the backend stays private behind the proxy):

- **http://192.168.1.249:5173**

This is the host machine's current LAN IP — it may change (it's DHCP-assigned); run `ipconfig` on the host to confirm. The Vite dev server must be exposed on the LAN (`server.host: true` in `vite.config.ts`) and the host firewall must allow inbound TCP **5173**. Details: [ai-docs/dev-setup.md](ai-docs/dev-setup.md).

---

## Project Structure

```
Recruitment.Gorilla/
├── AGENTS.md                    # Entry point for AI agents / contributors
├── ai-docs/                     # Context & spec docs (architecture, conventions, playbook…)
├── PROJECT_PLAN.md              # Architecture decisions and build order
├── README.md                    # This file
├── .gitignore
│
├── client/                      # React 19 + TypeScript frontend
│   ├── public/logo.png          # Brand logo
│   └── src/
│       ├── auth/AuthContext.tsx     # Auth state + silent refresh
│       ├── components/
│       │   ├── BulkUploader.tsx     # Drag-and-drop CV upload zone
│       │   ├── CandidateForm.tsx    # Editable candidate profile form
│       │   └── StatusTimeline.tsx   # Vertical status history timeline
│       ├── pages/
│       │   ├── LoginPage.tsx
│       │   ├── UploadPage.tsx
│       │   ├── CandidatesPage.tsx
│       │   └── CandidateDetailPage.tsx
│       ├── services/api.ts          # Axios layer + auth interceptors
│       ├── types/index.ts           # Shared TypeScript types
│       └── index.css                # Microsoft Fluent theme
│
└── server/
    └── Recruitment.Gorilla.API/
        ├── Controllers/             # Auth, Candidates, CVUpload
        ├── Models/                  # Candidate, CVFile, StatusHistory, RefreshToken
        ├── DTOs/                    # Request / response records
        ├── Services/                # AuthService, CandidateService, CVParserService
        ├── Data/AppDbContext.cs
        ├── Migrations/
        ├── Uploads/                 # CV files (gitignored)
        ├── Logs/                    # log4net output (gitignored)
        ├── log4net.config
        └── Program.cs
```

---

## Database Schema

See [ai-docs/data-model.md](ai-docs/data-model.md) for full detail. Tables: **Candidates** (profile + denormalized `CurrentStatus`), **CVFiles** (1‑*, cascade), **StatusHistories** (append-only, 1‑*, cascade), and **RefreshTokens** (auth; stores only the SHA‑256 hash of each refresh token).

---

## API Endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/login` | — | Log in; returns access token + sets httpOnly refresh cookie |
| `POST` | `/api/auth/refresh` | cookie | Rotate refresh token, issue new access token |
| `POST` | `/api/auth/logout` | cookie | Revoke refresh token, clear cookie |
| `POST` | `/api/cvupload` | ✓ | Upload CV file, returns extracted candidate draft |
| `GET` | `/api/candidates` | ✓ | List candidates (paged, searchable, status filter) |
| `POST` | `/api/candidates` | ✓ | Save candidate (409 + existing record on duplicate email; `allowDuplicate: true` overrides) |
| `GET` | `/api/candidates/{id}` | ✓ | Candidate detail + CV files + status history |
| `PUT` | `/api/candidates/{id}` | ✓ | Update candidate profile |
| `POST` | `/api/candidates/{id}/status` | ✓ | Add a status change with comment |
| `GET` | `/api/candidates/{id}/cv/{fileId}` | ✓ | Stream/download the original CV file |
| `GET` | `/api/candidates/roles` | ✓ | Distinct applied-role values (role suggestions) |
| `DELETE` | `/api/candidates/{id}` | ✓ | Delete candidate + CV files + history |
| `GET` | `/api/status-options` | ✓ | Active status dropdown options |
| `GET` | `/api/status-options/initial` | ✓ | Initial status dropdown options |
| `GET` | `/api/status-options/next/{candidateId}` | ✓ | Allowed next statuses for a candidate |
| `GET`·`POST` | `/api/config/roles` | ✓ | List / create Role Applied options |
| `PUT`·`DELETE` | `/api/config/roles/{id}` | ✓ | Update / soft-disable-or-delete a Role Applied option |
| `GET`·`POST` | `/api/config/skills` | ✓ | List / create Skill options |
| `PUT`·`DELETE` | `/api/config/skills/{id}` | ✓ | Update / soft-disable-or-delete a Skill option |

All `✓` endpoints require a bearer access token. Auth design (rotation, hashing, hardening): [ai-docs/auth.md](ai-docs/auth.md).

---

## CV Parsing

Text is extracted (PdfPig for PDF, OpenXml for `.docx`) and fields are pulled with best-effort heuristics:

| Field | Strategy |
|---|---|
| Name | Leading run of ALL-CAPS header words, with double-space / clean-line fallbacks |
| Email | Regex, tolerant of whitespace around `@` (e.g. `name @ domain`) |
| Phone | Regex: `(\+?\d[\d\s\-().]{7,}\d)` |
| LinkedIn / GitHub | Visible `linkedin.com/in/...` / `github.com/...`, else recovered from the PDF's hyperlink annotations |
| Skills / Summary | Text block following a matching heading |

Extraction is best-effort and **always editable** before saving. Robust LLM-based extraction is planned for Phase 2.

---

## Development Notes

- EF Core packages are pinned to **9.0.0** to stay within Pomelo 9.x's compatibility window (`>= 9.0.0 && <= 9.0.999`).
- **Secrets** (connection string, `Jwt:Key`, `Auth:PasswordHash`) are supplied per-machine via .NET user secrets, never committed.
- The backend binds to **localhost only**; the frontend (Vite) is the only thing exposed on the LAN and proxies `/api` to it.
- Uploaded files are stored as `{GUID}{.pdf|.docx}`; the original filename is preserved in the database.
- Status dropdown values come from the seeded `StatusOptions` lookup table, with allowed transitions in `StatusTransitions`; admin-editable configuration is planned for a later phase.
- Logging uses **log4net** (`log4net.config`) → console + daily rolling file under `Logs/`.
- The `Uploads/` and `Logs/` directories are excluded from git.
- Stop the running API before `dotnet build` / migrations (the running process locks the executable).

---

## Roadmap

- **Phase 2** — LLM-based CV extraction, admin-editable workflow configuration, role-based access (admin vs. recruiter), email notifications
- **Phase 3** — Interview scheduling, offer management, reporting dashboard
