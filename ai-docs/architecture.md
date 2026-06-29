# Architecture

## What it is
A single-admin recruitment management system (Phase 1). The admin bulk-uploads CVs (PDF / `.docx`), the API extracts candidate fields for review, candidates are stored in MySQL, and each candidate has an **append-only status history** rendered as a vertical timeline.

## Monorepo layout
```
Recruitment.Gorilla/
├── AGENTS.md                  # agent entry point
├── ai-docs/                   # these docs
├── PROJECT_PLAN.md            # architecture decisions + build order
├── README.md                  # human setup guide
├── client/                    # React 19 + TypeScript (Vite)
│   └── src/
│       ├── auth/AuthContext.tsx
│       ├── components/        # BulkUploader, CandidateForm, StatusTimeline
│       ├── pages/             # LoginPage, UploadPage, CandidatesPage, CandidateDetailPage
│       ├── services/api.ts    # typed Axios layer + auth interceptors
│       ├── types/index.ts     # shared TS types
│       └── index.css          # Microsoft Fluent theme
└── server/
    └── Recruitment.Gorilla.API/
        ├── Controllers/       # Auth, Candidates, CVUpload
        ├── Services/          # AuthService, CandidateService, CVParserService
        ├── Models/            # Candidate, CVFile, StatusHistory, RefreshToken
        ├── Data/AppDbContext.cs
        ├── DTOs/
        ├── Migrations/
        ├── Uploads/           # stored CV files (gitignored)
        ├── Logs/              # log4net output (gitignored)
        └── Program.cs
```

## Tech stack (pinned)
| Layer | Choice | Version |
|---|---|---|
| Backend | ASP.NET Core Web API | .NET 10 |
| ORM | EF Core + Pomelo MySQL | 9.0.0 / 9.0.0 |
| Auth | JWT bearer + refresh tokens | Microsoft.AspNetCore.Authentication.JwtBearer 10.0.x |
| Logging | log4net (via Microsoft.Extensions.Logging.Log4Net.AspNetCore) | — |
| API docs | Swashbuckle (Swagger) | 10.x |
| CV parsing | PdfPig (PDF) + DocumentFormat.OpenXml (Word) | 0.1.15 / 3.5.1 |
| Frontend | React + TypeScript + Vite | 19 / Vite 8 |
| Data fetching | TanStack Query v5 + Axios | — |
| UI | react-bootstrap 2 + Bootstrap 5, Fluent theme | — |
| Routing | react-router-dom | 7 |

> EF Core packages are pinned to **9.0.0** to stay inside Pomelo 9.x's compatibility window. Do not bump them independently.

## Request flow
```
Browser (http://<host>:5173)
   │  React app makes same-origin calls to /api/...
   ▼
Vite dev server (port 5173, exposed on LAN)
   │  server.proxy forwards /api → http://localhost:5000   (vite.config.ts)
   ▼
ASP.NET Core API (localhost:5000 ONLY — never bound to 0.0.0.0)
   │  Controller → Service → AppDbContext (EF Core)
   ▼
MySQL (localhost:3306, database "RecruitmentGorilla")
```

### Why the backend is localhost-only
The API must **not** be reachable directly from other machines. Only the Vite frontend is exposed on the LAN; it proxies `/api` to the backend running on the same host. This means:
- The browser always calls **same-origin `/api`** (see `client/src/services/api.ts`, `baseURL = '/api'`).
- The backend runs with `--urls http://localhost:5000` (loopback only).
- Firewall opens **only** port 5173.

Do not change the frontend to call the backend by IP/port, and do not bind the backend to `0.0.0.0`.

## Auth at a glance
JWT access token (short-lived, in browser memory) + opaque refresh token in an **httpOnly, SameSite=Strict cookie** scoped to `/api/auth`, with server-side rotation and revocation. All data endpoints require auth (default-deny). Full detail in [auth.md](auth.md).

## Dev vs prod
- **Dev** (current): HTTP, Vite proxy, refresh cookie `Secure=false`, Swagger enabled, secrets in user-secrets.
- **Prod** (future): serve the built client behind a real web server / the API; enable HTTPS (the refresh cookie auto-sets `Secure` outside Development); move secrets to environment variables / a vault. See [dev-setup.md](dev-setup.md) and `PROJECT_PLAN.md` roadmap.
