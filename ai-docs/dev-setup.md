# Dev Setup & Run

## Prerequisites
- .NET 10 SDK
- Node.js 20+
- MySQL 8+ (running on `localhost:3306`)
- `dotnet-ef` CLI **9.0.0**: `dotnet tool install --global dotnet-ef --version 9.0.0`

## 1. Secrets (per machine, not committed)
All three live in **.NET user secrets** for the API project.
```bash
cd server/Recruitment.Gorilla.API

# DB connection
dotnet user-secrets set "ConnectionStrings:DefaultConnection" "Server=localhost;Port=3306;Database=RecruitmentGorilla;User=root;Password=<yours>;"

# JWT signing key (must be >= 32 bytes)
dotnet user-secrets set "Jwt:Key" "<random base64 key>"

# Admin password hash (default login admin/admin)
dotnet user-secrets set "Auth:PasswordHash" "<pbkdf2 hash>"
```

### Generate a JWT key + password hash (PowerShell)
```powershell
# Random signing key
$k = New-Object byte[] 64; [Security.Cryptography.RandomNumberGenerator]::Fill($k)
[Convert]::ToBase64String($k)

# PBKDF2-HMAC-SHA256 hash, format "iterations.saltB64.hashB64"
$pass = "admin"
$salt = New-Object byte[] 16; [Security.Cryptography.RandomNumberGenerator]::Fill($salt)
$iter = 100000
$pb = New-Object Security.Cryptography.Rfc2898DeriveBytes($pass,$salt,$iter,[Security.Cryptography.HashAlgorithmName]::SHA256)
"$iter.$([Convert]::ToBase64String($salt)).$([Convert]::ToBase64String($pb.GetBytes(32)))"
```
The hash format and algorithm must match `AuthService.VerifyPassword` (PBKDF2-SHA256, 32-byte key). To change the admin password, regenerate with a new `$pass` and update the secret.

## 2. Database
```bash
cd server/Recruitment.Gorilla.API
dotnet ef database update     # creates the DB + tables if needed
```

## 3. Run (two terminals)
```bash
# Backend — localhost only (do NOT bind 0.0.0.0)
cd server/Recruitment.Gorilla.API
$env:ASPNETCORE_ENVIRONMENT="Development"      # loads user secrets, enables Swagger
dotnet run --urls http://localhost:5000

# Frontend
cd client
npm install
npm run dev                                    # http://localhost:5173
```
Login: **admin / admin**. Swagger: `http://localhost:5000/swagger`.

## 4. Verify a change
```bash
# Backend (stop the running API first — it locks the exe)
cd server/Recruitment.Gorilla.API && dotnet build

# Frontend typecheck
cd client && npx tsc -b
```
Smoke-test through the proxy: `http://localhost:5173/api/...` should behave like the API (401 without a token, 200 after login).

## 4b. Run the tests
```bash
cd server
dotnet test                       # runs Recruitment.Gorilla.Tests
```
- **Requires the local MySQL server running** (the tests use real MySQL/Pomelo, not an in-memory fake).
- Each run creates a **throwaway database** `RG_Test_{guid}` on the same server, migrates it (schema +
  seed), runs, then **drops it** — the real `RecruitmentGorilla` database is never touched.
- The connection comes from the env var **`RG_TEST_MYSQL`** if set, otherwise the API's **user-secrets**
  `ConnectionStrings:DefaultConnection` (the test project shares the API's `UserSecretsId`); only the
  database name is swapped. No credential is committed.
- Isolation/pattern: one migrated DB per run (xUnit collection fixture, classes run sequentially) +
  a **transaction rolled back per test**, so tests are order-independent. Data builders live in
  `Recruitment.Gorilla.Tests/Infrastructure/TestData.cs`.

## 5. LAN access (frontend only)
Other PCs on the network use the **frontend only**; the backend stays private behind the proxy.
- Vite is exposed via `server.host: true` in `vite.config.ts` (or `npm run dev -- --host`). It prints a `Network:` URL like `http://<your-ip>:5173`.
- The browser calls same-origin `/api`, which Vite proxies to `localhost:5000` — so **only port 5173** needs to be open.
- Windows firewall (admin), works on a Public network too:
  ```powershell
  New-NetFirewallRule -DisplayName "RecruitmentGorilla Web 5173" -Direction Inbound -Protocol TCP -LocalPort 5173 -Action Allow -Profile Any
  ```
- Add the LAN origin to `AllowedOrigins` in `appsettings.json` only if you bypass the proxy (normally not needed).

## Notes / gotchas
- **Stop the API before building or running migrations** (file lock on the exe).
- User secrets only load in the **Development** environment — run with `ASPNETCORE_ENVIRONMENT=Development`.
- Logs: `server/Recruitment.Gorilla.API/Logs/recruitment-gorilla.log` (+ console).
- Uploaded files: `server/Recruitment.Gorilla.API/Uploads/` (gitignored).
