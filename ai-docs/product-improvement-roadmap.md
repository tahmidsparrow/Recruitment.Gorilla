# Product Improvement Roadmap

**Status:** Living document
**Author:** AI agent (analysis)
**Date:** 2026-07-13

A prioritized analysis of where **Recruitment.Gorilla** should invest next, as a recruiting
application (ATS). Each item notes the **current state** in the codebase, **why it matters**, and a
rough **effort**. This is advisory — turn any item into a `specs/` spec before building.

**Priority legend:** 🔴 high impact · 🟡 medium · 🟢 nice-to-have
**Effort:** S (days) · M (1–2 weeks) · L (multi-week)

## Quick scan

| # | Item | Priority | Effort | Data already exists? |
|---|---|---|---|---|
| 1 | Email / transactional communication | 🔴 | M | partial (notifications) |
| 2 | Real interview scheduling (timezones, calendar invites) | 🔴 | M–L | partial (datetime + interviewers) |
| 3 | Aggregate interview scorecards + candidate comparison | 🔴 | M | ✅ evaluations captured |
| 4 | Search & filtering + bulk actions | 🔴 | M | ✅ status history / skills |
| 5 | Recruiting analytics (time-to-hire, funnel, time-in-stage) | 🔴 | S–M | ✅ StatusHistory timestamps |
| 6 | Data privacy / compliance (retention, consent, RTBF) | 🔴 | M–L | ❌ not tracked |
| 7 | Auth hardening (login rate-limit, password policy, seed admin) | 🔴 | S | n/a |
| 8 | Audit trail (who changed what, when) | 🟡 | M | partial (StatusHistory only) |
| 9 | File handling (cloud storage, AV scan, multi-doc) | 🟡 | M | partial (local disk) |
| 10 | Automated tests (access scoping, transitions, gates) | 🟢 **started** | M | n/a |
| 11 | Recruiter-picker guardrail (assign only Recruiter-role users) | 🟢 | S | ✅ |
| 12 | Offer stage (offer letters, approvals) | 🟡 | M | ❌ pipeline ends at Recommended |
| 13 | Candidate source tracking | 🟡 | S | ❌ no source field |
| 14 | Public job board / application intake | 🟢 | L | partial (roles = openings) |

## Highest-impact product gaps

### 1. Email / real communication 🔴 (M)
- **Now:** notifications are **in-app only** (`Services/NotificationService.cs`, the navbar bell). No email to candidates or interviewers.
- **Why:** recruiting *is* communication — invites, status updates, rejections, interviewer assignments. Biggest user-facing gap.
- **Start with:** transactional email (interview-assigned → interviewer; status-change → candidate) behind a template system; make in-app `Notification` and email share one dispatch path.

### 2. Real interview scheduling 🔴 (M–L)
- **Now:** "Interview Scheduled" is a raw `datetime-local` + assigned users (`CandidateService.AddStatusAsync` → `Interview`). Interviewer notes + a re-schedule loop exist.
- **Missing:** **timezones**, calendar invites (`.ics` / Google / Outlook), availability & conflict checks, candidate-facing reschedule notice.
- **Why:** nobody outside the app currently knows an interview exists.

### 3. Aggregate scorecards + candidate comparison 🔴 (M)
- **Now:** rich per-interviewer evaluations (rubric A–D, overall rating, recommendation) + an Interview-Completed summary of each submitted evaluation (`StatusHistoryDto.EvaluationSummaries`).
- **Missing:** roll-up **across** interviewers (average, agreement/divergence) and **side-by-side** comparison of candidates for the same role.
- **Why:** this is where hiring decisions are actually made.

### 4. Search, filtering & bulk actions 🔴 (M)
- **Now:** candidate list filters by name/email substring + a single status (`CandidateService.GetAllAsync`).
- **Add:** filter by **skill**, role, experience range, date, multi-status; full-text over CV content; saved views; bulk actions (bulk status change, bulk assign).

## Recruiting analytics 🔴 (S–M)

The dashboard has counts + a trend, but the metrics that run a recruiting org are absent — **and the
data is already captured** in `StatusHistory` (per-change timestamps):
- **Time-to-hire** and **time-in-stage** (compute from `StatusHistory.ChangedAt` deltas).
- **Funnel conversion rates** stage-to-stage (not just current counts).
- **Interviewer turnaround** (evaluations submitted vs pending).
- **Source effectiveness** — blocked on #13 (no source field yet).

Low effort / high visibility because no new capture is needed for most of it.

## Data, privacy & security

### 6. Compliance (GDPR / PII) 🔴 (M–L)
Candidate PII + CVs stored with **no consent tracking, retention policy, or true right-to-be-forgotten**
(delete exists but no retention automation / audit). Likely mandatory depending on jurisdiction.

### 7. Auth hardening 🔴 (S)
- No login **rate-limiting / lockout** on `/api/auth/login` (brute-force risk).
- No visible **password policy**.
- README default is `admin/admin` — force-rotate the seed admin.

### 8. Audit trail 🟡 (M)
Logging is log4net INFO lines; no **queryable** "who changed what, when." Status changes, evaluations,
and deletes should be auditable (extend beyond `StatusHistory`, which only covers status).

### 9. File handling 🟡 (M)
CVs on **local disk** (`Uploads/`, GUID-named), no virus scanning, and only one CV at create time.
Consider object/cloud storage + AV scan + multi-document support (CV, portfolio, offer).

## Engineering health

### 10. Automated tests 🟢 (started; M for full coverage)
**First suite delivered** — `server/Recruitment.Gorilla.Tests` (xUnit, real-MySQL integration, 27 tests)
covers exactly the high-risk logic: candidate **access scoping** (owned OR assigned-role recruiter;
strict-owner delete), **status-transition** rules + required-field gates (incl. Interview-Completed
**≥1-submitted** and role-lock), the evaluation **submit-gate + submit-lock**, and **recruiter
assignment** / scoped role lookup / delete rules. See [dev-setup.md](dev-setup.md#4b-run-the-tests).
**Frontend Tiers 1 & 2 delivered** — `client` Vitest suite (27 tests): pure utils
(`skillColors`/`statusColors`/`evaluationCriteria`), `AuthContext` role-derivation flags, and
logic-heavy components — `StatusTimeline` (legacy-comment stripping, eval cards, gated links),
`EvaluationForm` (submit gate), `CandidateForm` (validation + single-role auto-select). API mocked,
no network; run with `npm test`.
**Controller auth (#1), AuthService (#2) & E2E (#7) delivered** — `WebApplicationFactory` integration
tests assert the `[Authorize]` attributes per role (delete = Admin-only, config = Admin+, SuperAdmin-only
role delete, Interviewer lockout, default-deny 401); `AuthService`/`PasswordHasher` cover credential
verify, JWT issuance, refresh rotation/revocation, change-password; a read-only **Playwright** smoke
(`npm run e2e`) drives login → dashboard → candidates → detail against the live stack. Backend total: 64.
**Next:** widen backend to Dashboard scoping + CV access/streaming + `AddStatusAsync` side-effects;
frontend Tier 2 for the remaining pages; then wire `dotnet test` + `npm test` into CI.

### 11. Recruiter-picker guardrail 🟢 (S)
Any active user (even an Interviewer) can be assigned as a role's recruiter, which silently grants no
access (the `CanWriteCandidate` gate blocks non-Recruiters). Restrict the Configuration recruiter
picker to users holding the **Recruiter** role (or higher) to remove the footgun.

## Pipeline completeness

### 12. Offer stage 🟡 (M)
Pipeline ends at **Recommended**. No offer stage, offer letter generation, or approval workflow.

### 13. Candidate source tracking 🟡 (S)
No **source** field on candidates → source effectiveness analytics (part of #5) is impossible. Add a
source field (referral / job board / agency / direct) + surface in reporting. (Referral capture
already exists via `IsReferred` + reference fields — generalize it.)

### 14. Public job board / application intake 🟢 (L)
Roles double as job openings (`RoleAppliedOption` with End Date / location / department), but there's
no public posting or candidate self-application intake or source attribution.

## Suggested sequencing

1. **Email (#1) + real scheduling (#2)** — biggest user-facing value.
2. **Tests around access scoping + transitions (#10)** — protects what's already built.
3. **Recruiting analytics (#5)** — high visibility, data already captured, low effort.
4. **Compliance (#6) + auth hardening (#7)** — before real applicant data scales.
5. Then scorecards/comparison (#3), search/bulk (#4), offer stage (#12).

Quick wins to slot in anytime: **#7 (auth hardening)**, **#11 (recruiter-picker guardrail)**, **#13 (source field)**.

## Baseline — what already exists (so this doc stays honest)
Candidate CV upload + parse; configurable status pipeline with a transitions table; roles/job-openings
with End-Date lock, location/department/priority, and **many-to-many recruiter assignment granting
candidate access**; skills + interview-type tag lookups; interview assignment + in-app notifications +
per-interviewer evaluation forms (submit-lock) + completion summary + re-schedule; dashboard (org-wide
KPIs/charts + owner/role-scoped sections with a recruiter role filter); role hierarchy
SuperAdmin → Admin → Recruiter → Interviewer with access scoping; JWT auth + rotating refresh tokens.
