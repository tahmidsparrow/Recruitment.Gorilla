# Recruitment Gorilla — Feature List & Product Improvement Roadmap

**Document Version:** 2.0.0  
**Target Product:** Recruitment Gorilla (Enterprise Recruitment & Applicant Tracking System)  
**Authors:** Senior Product Manager, Principal Software Architect, Senior UI/UX Designer, QA Architect, Security & Accessibility Specialists  
**Status:** Living Product Strategy & Engineering Roadmap  
**Date:** August 2026  

---

## 1. Executive Summary

**Recruitment Gorilla** is a full-stack applicant tracking and recruitment management system built on **ASP.NET Core (.NET 10)**, **EF Core 9 / MySQL**, and **React 19 / TypeScript / Vite** with the custom **Prism** design system. 

The application provides a robust foundation for CV intake, status lifecycle tracking, interviewer assignments, structured evaluation scoring, and audit logging. However, as recruitment teams scale from single-admin hobby workflows to enterprise-grade multi-department talent acquisition, the platform faces critical product gaps, architectural bottlenecks, and UX limitations.

This document serves as the **master product and technical roadmap** for taking Recruitment Gorilla to a top-tier, modern, AI-augmented, enterprise-ready recruitment platform. It identifies existing bugs, architectural debt, UI/UX friction points, security/compliance requirements (GDPR, 2FA, rate limiting), and introduces high-value product features (Kanban visual pipelines, candidate comparison matrix, AI-powered semantic matching, two-way calendar sync, candidate self-service portal, and executive analytics).

---

## 2. Application Overview

### 2.1 Core Architectural Flow
```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│                                   CLIENT LAYER (Vite / React 19)                       │
│  - AppShell: Responsive Sidebar (Desktop Rail / Mobile Drawer), Topbar, NavRoutes       │
│  - Pages: Dashboard, Candidates, Detail, Upload, Evaluation Report, Interview, Config   │
│  - State & Data: TanStack Query v5, Typed Axios API Client, AuthContext (JWT memory)   │
│  - Design System: Prism Tokens (Light/Dark mode, WCAG AA, Mobile-first responsive)      │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ Same-Origin Proxy (/api)
┌───────────────────────────────────────────▼─────────────────────────────────────────────┐
│                            BACKEND API LAYER (ASP.NET Core / .NET 10)                  │
│  - Auth & Security: JWT Bearer Auth + HttpOnly SameSite=Strict Refresh Cookie Rotation  │
│  - Controllers: Auth, Candidates, CVUpload, Config, Users, Interviews, Audit, Dashboard │
│  - Services: Candidate, CVParser, Interview, Notification, Email, Audit, Config, User  │
│  - Storage & Files: Local filesystem (Uploads/{GUID}.ext), AES-256 Secret Protector    │
└───────────────────────────────────────────┬─────────────────────────────────────────────┘
                                            │ Entity Framework Core 9.0.0 (Pomelo MySQL)
┌───────────────────────────────────────────▼─────────────────────────────────────────────┐
│                                  DATABASE LAYER (MySQL 8+)                              │
│  - Tables: Users, UserRoles, RefreshTokens, Candidates, CVFiles, StatusHistories        │
│  - Workflow: StatusOptions, StatusTransitions, RoleAppliedOptions, SkillOptions         │
│  - Interviews: Interviews, InterviewInterviewers, InterviewEvaluations, EvaluationItems │
│  - Auditing & Config: AuditLogs, CandidateSourceOptions, EmailSettings, Notifications  │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Roles & Permission Hierarchy
1. **SuperAdmin:** Full system control, user provisioning, global SMTP configuration, role deletion, audit log inspection.
2. **Admin:** Configuration management (openings, skills, sources, interview tags), candidate deletion, unrestricted candidate CRUD and status management, audit log inspection.
3. **Recruiter:** Candidate creation/upload, profile editing, and status management for **owned candidates** or candidates under **assigned job openings**. Cannot delete candidates or edit global configuration.
4. **Interviewer:** Restricted access. Dashboard KPI overview, assigned interviews view, candidate profile snapshot reading, and evaluation rubric completion. Cannot browse general candidate lists.

---

## 3. Current-State Assessment

### 3.1 Strengths of Current Implementation
- **Clean Architecture & Conventions:** Strict separation of Concerns (Controller → Service → DbContext / DTOs), strongly typed APIs, consistent error handling patterns.
- **Hardened Access Scoping:** Granular recruiter assignment permissions (many-to-many role-recruiter mapping), query-level EF filtering, default-deny authorization policies.
- **Design Token Discipline (Prism):** Centralized CSS custom properties in `tokens.css`, cohesive light/dark theming, zero hardcoded magic hex values, mobile-first CSS architecture with `.table-cards`.
- **Structured Interview Rubrics:** 12-criterion standardized scoring model with submit-lock protection, preventing peer interviewer anchoring bias.
- **Comprehensive Audit Logging:** Append-only security logging across all authentication, user management, configuration, and candidate lifecycle mutations.
- **Standards-Compliant Calendar Invites:** RFC 5545 `.ics` MIME generation with line folding and character escaping, plus Google/Outlook direct web calendar links.

### 3.2 Key Technical & Product Deficiencies
- **Synchronous File Processing & Memory Queues:** CV bulk upload processes files directly in HTTP handler and retains batch state in ephemeral browser memory. Tab refreshes cause lost batches.
- **Heuristic-Only CV Extraction:** Regex and font-casing heuristics in `CVParserService` frequently misidentify complex layout resumes, miss experience durations, and cannot extract unstructured job histories.
- **No Full-Text CV Search:** Extracted resume text is discarded after draft creation; search only indexes `FullName`, `Email`, and `Phone`.
- **Pipeline Abruptly Stops at 'Recommended':** Absence of Offer, Negotiation, Hired, or Onboarding stages.
- **In-App Communication Silo:** External candidates receive zero automated or manual emails (application receipt, interview confirmation, status update, offer letter).
- **Single-File Constraint:** Candidates cannot have multiple attachments (e.g., Portfolio, Cover Letter, Reference Letters, Background Check).
- **Missing Recruiting Operational Metrics:** No Time-to-Hire, Stage Duration Velocity, Funnel Dropout Conversion, or Source ROI analytics.
- **Security & Privacy Gaps:** No login brute-force rate-limiting/lockout, no MFA, no automated GDPR data retention or right-to-be-forgotten anonymization.
- **Typographical Technical Debt:** Persistent typo `"Submission Receieved"` across database seeds, entity models, and frontend code.

---

## 4. Major Problems Identified

| Area | Issue Description | Root Cause / Impact | Severity |
|---|---|---|---|
| **Pipeline Completeness** | Workflow terminates at `Recommended` | Recruiters must manage offers, contracts, and hiring outcomes outside the application. | High |
| **CV Searchability** | No full-text search across candidate CVs | `CVParserService` extracts text for draft parsing but never persists the raw text to DB. Recruiters cannot search past CVs by keywords. | Critical |
| **Candidate Communication** | Zero outbound communication to candidates | Emails are only sent to internal interviewers. Candidates never receive interview invites, task assignments, or rejection notices. | Critical |
| **Batch Upload Resiliency** | Upload queue lost on page refresh | `UploadPage` stores draft queue in React `useState`. If an admin uploads 50 CVs and accidentally closes the tab, all review state is lost. | High |
| **Rubric Inflexibility** | 12 fixed evaluation criteria for all roles | Engineering, Sales, HR, and Executive roles require different evaluation rubrics. Fixed criteria force irrelevant scoring. | Medium |
| **Calendar Synchronization** | No 2-way calendar integration | System generates 1-way `.ics` files. Recruiter cannot check interviewer real-time calendar availability or conflicts. | High |
| **Recruiter Analytics** | Lack of pipeline velocity and conversion metrics | Database has rich `StatusHistory` timestamps, but dashboard only displays snapshot counts, missing Time-to-Hire and Funnel Dropouts. | Medium |
| **Security: Brute Force** | No rate limiting on `/api/auth/login` | Attacker can launch brute-force credential stuffing against user accounts. | Critical |
| **Compliance: GDPR** | No data retention or RTBF capability | Candidate PII and CV files remain indefinitely. No automated purging or anonymization tools. | High |
| **Code Quality / Typo** | `"Submission Receieved"` typo in codebase & DB | Inconsistent spelling causes maintenance friction and potential data migration bugs. | Low |

---

## 5. UI/UX Audit

### 5.1 Minor Polish Candidates
1. **Candidate List Filter Chips:** Active filter chips for Role, Skills, and Status currently render with varying margin alignments. Standardize with a unified `.filter-tag-group`.
2. **Table Action Tooltips:** Action buttons (Delete, Edit, Preview) in dense table rows lack micro-tooltips for screen readers and new users.
3. **Empty State Illustrations:** Replace basic Lucide icons in empty states with branded SVG micro-illustrations for "No Candidates", "No Interviews", and "Upload Complete".
4. **Phone Formatting:** Phone numbers display as unformatted raw input. Add localized phone masking and formatting (e.g., `+1 (555) 019-2834`).
5. **Timeline Micro-Animations:** Status history timeline entries should have subtle cascade fade-in animations when loaded or expanded.

### 5.2 Moderate Redesign Candidates
1. **Dashboard KPI & Metric Layout:**
   - *Current Problem:* KPI cards are fixed in a 6-card row with limited comparative period insights.
   - *Redesign:* Introduce customizable metric cards showing percentage trends compared to previous month/quarter, plus a collapsible "My Work Queue" drawer.
2. **Candidate Detail Page Header & Tab Layout:**
   - *Current Problem:* Candidate detail uses a 2-panel layout (`5/7` column split) that becomes crowded with lengthy resumes, multiple CVs, and extensive status histories.
   - *Redesign:* Transition Candidate Detail into a structured Tabbed Workspace: `[Profile & Resume]`, `[Timeline & Notes]`, `[Interviews & Scorecards]`, `[Emails & Communications]`, `[Documents & Files]`.
3. **Job Opening Configuration Tab:**
   - *Current Problem:* Job openings table in Configuration uses custom full-width rows with minimal sorting and filtering.
   - *Redesign:* Provide a unified Data Grid with department filters, recruiter avatars, applicant count drill-through badges, and quick-toggle status switches.

### 5.3 Complete Redesign Candidates

#### Redesign Candidate 1: Candidates View — Dual-Mode Visual Pipeline (Kanban Board & Data Table)
* **Current State:** Candidates are viewed exclusively through a paginated tabular list. While effective for bulk scanning, it fails to provide recruiters with an intuitive visual sense of candidate distribution across pipeline stages.
* **Why Redesign:** Modern recruitment workflows revolve around visual Kanban stages. Recruiters need to see bottlenecks, drag candidates from *Screening* to *Technical Assessment*, and quickly spot stagnant candidates.
* **Target UX & Interaction Flow:**
  - **View Switcher:** Persistent toggle in `.page-bar` (`Table View` vs. `Kanban Pipeline Board`).
  - **Kanban Board Layout:** Horizontal scrollable board with stage columns (`Uploaded`, `Screening`, `Assessment`, `Interview`, `Offer`, `Hired`, `Archived`).
  - **Stage Column Cards:** Each column displays candidate count, average days in stage, and candidate cards.
  - **Candidate Card Design:** Shows candidate avatar, full name, applied role badge, match score, rating summary, days in current stage (with warning color if > 7 days), and assigned recruiter pill.
  - **Drag-and-Drop Workflow:** Dragging a candidate card to a new stage automatically checks transition rules and triggers the corresponding action modal (e.g., scheduling dialog when dropped into `Interview Scheduled`).
  - **Quick Filters:** Filter by Job Opening, Recruiter, Skill, Source, and Stagnant status without reloading the board.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│ [Search candidates...] [All Roles ▼] [All Recruiters ▼] [Filter]          [ ⊞ Board | ≡ Table ]  │
├──────────────┬──────────────┬──────────────┬──────────────┬──────────────┬───────────────────────┤
│ SCREENING(4) │ ASSESS (3)   │ INTERVIEW(5) │ EVALUATED(2) │ OFFER (1)    │ HIRED (8)             │
├──────────────┼──────────────┼──────────────┼──────────────┼──────────────┼───────────────────────┤
│ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌──────────┐ │ ┌───────────────────┐ │
│ │Jane Doe  │ │ │Alex Smith│ │ │Sara Connor│ │ │Mark Davis│ │ │Lisa Wong │ │ │David Kim          │ │
│ │Sr Dev 4d │ │ │QA Eng 2d │ │ │DevOps 1d │ │ │Fullstack │ │ │Lead Eng  │ │ │Hired: Aug 14      │ │
│ │★★★★☆ (4) │ │ │Task Sent │ │ │Tomorrow  │ │ │Avg: 4.8  │ │ │Sent: $140│ │ │Offer Accepted    │ │
│ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └──────────┘ │ └───────────────────┘ │
└──────────────┴──────────────┴──────────────┴──────────────┴──────────────┴───────────────────────┘
```

#### Redesign Candidate 2: Bulk CV Intake & Verification Studio
* **Current State:** Dropping multiple files queues drafts in memory and presents them one-by-one in an isolated form. If 30 CVs are uploaded, the recruiter must sequentially verify each without any batch operations or high-level status.
* **Why Redesign:** Enterprise recruiters process 50–200 CVs daily. A sequential modal form creates severe fatigue and inefficiency.
* **Target UX & Interaction Flow:**
  - **Dual-Pane Batch Workspace:** Left pane displays the batch queue table (File Name, Detected Name, Email, Role, Confidence Score, Extraction Status); right pane displays the interactive Split-Screen Resume Previewer + Extracted Field Editor.
  - **Batch Operations:** Select all -> Batch assign Target Role, Batch assign Source, Batch assign Initial Status.
  - **Real-Time Confidence Highlighting:** Fields extracted with high AI confidence show subtle green verification checkmarks; uncertain fields highlight in amber for quick manual correction.
  - **Keyboard Navigation:** `Cmd+Enter` to save and advance to next candidate; `Cmd+Delete` to skip/discard.

---

## 6. Feature Gap Analysis

| Feature Domain | Existing Baseline in Codebase | Industry Standard (Greenhouse / Lever / Ashby) | Severity Gap |
|---|---|---|---|
| **Pipeline Workflow** | Static table-based linear transitions up to "Recommended" | Multi-stage pipeline with customizable stages, Offer letters, Hired, and Rejection reasons taxonomy | Critical |
| **Sourcing & Intake** | Manual admin bulk upload | Public Careers Portal, Embeddable Job Widget, Email-in parsing, LinkedIn extension | High |
| **Candidate Search** | Substring SQL matching on Name/Email/Phone | Full-text CV search, boolean operators (`AND`, `OR`, `NOT`), skill tag auto-complete, semantic AI matching | Critical |
| **Interviews & Calendar** | One-way `.ics` attachment + web links | 2-way Google/Outlook calendar sync, live availability lookup, automated candidate self-scheduling links | High |
| **Scorecards & Rubrics** | 12 fixed criteria across all roles | Role-specific custom rubrics, weighted scoring, mandatory notes per criterion | High |
| **Candidate Comparison** | Single candidate evaluation report | Side-by-side comparison matrix comparing 2–5 candidates on scorecards, skills, and salary expectations | Medium |
| **Candidate Comms** | In-app notifications only (no emails to candidates) | Full 2-way email messaging, customizable email templates with merge tags, automated trigger emails | Critical |
| **Analytics & Reporting** | Snapshot counts, 30-day volume trend, active openings | Time-to-Hire, Stage Velocity, Funnel Conversion, Sourcing Channel ROI, Recruiter Performance, CSV Export | High |
| **Compliance & Privacy** | Manual candidate deletion with file cascade | Automated GDPR retention policy (e.g. auto-delete after 12 months), RTBF candidate export & anonymize | High |
| **Security & Auth** | JWT + HttpOnly refresh cookie, SuperAdmin seed | Login rate limiting/lockout, Two-Factor Authentication (TOTP), Session idle timeout, Audit diffs | Critical |

---

## 7. Recommended Improvements

### Feature: Offer Management & Pipeline Extension to Hire
**Category:** Core Feature Improvement  
**Priority:** P0  
**Impact:** Critical  
**Effort:** Large  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
The candidate pipeline ends at `Recommended`. Recruiters have no structured mechanism to track offer preparation, approvals, offer extension, negotiation, candidate acceptance, or candidate rejection at the offer stage.

**Recommendation:**  
Extend the status pipeline and data model with first-class **Offer Management**:
1. Add new status options: `Offer Preparation`, `Offer Extended`, `Offer Accepted`, `Offer Declined`, `Hired`.
2. Introduce an `Offers` entity linked to `Candidate` storing: Base Salary, Currency, Bonus, Equity, Start Date, Expiration Date, Offer Letter Template ID, and Approval Status.
3. Add an Offer Generator creating standardized PDF offer letters using customizable company templates.
4. Update dashboard analytics to track Offer Acceptance Rate (OAR).

**Expected User Benefit:**  
Recruiters manage the complete candidate journey in one tool without switching to external spreadsheets.

**Business Benefit:**  
Provides visibility into hiring conversion, compensation metrics, and time-to-accept velocity.

**Implementation Notes:**  
- Migration `AddCandidateOfferStage` creating `Offers` and `OfferApprovals` tables.
- Add status transition rules allowing movement from `Recommended` → `Offer Preparation` → `Offer Extended` → `Offer Accepted` / `Offer Declined`.
- Enforce role-based security: only Admin/SuperAdmin and assigned Recruiters can view compensation figures.

**Dependencies:**  
`StatusOptions`, `CandidateService`, `EmailService`.

**Acceptance Criteria:**  
- Recruiter can move a `Recommended` candidate to `Offer Preparation` and enter compensation terms.
- System generates an offer summary card in the candidate profile.
- Candidate can be marked as `Offer Accepted` which transitions status to `Hired`.
- Offer acceptance metrics appear on the Dashboard.

---

### Feature: Interactive Visual Pipeline (Kanban Board View)
**Category:** UX Improvement / Productivity  
**Priority:** P0  
**Impact:** Critical  
**Effort:** Medium  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
Candidates are only accessible via a flat paginated table. Recruiters cannot visualize candidate distribution across hiring stages or spot blocked candidates.

**Recommendation:**  
Implement a responsive **Kanban Pipeline Board** on `/candidates`:
1. Add a view toggle: Table View (`≡`) vs. Pipeline Board (`⊞`).
2. Render stage columns corresponding to active `StatusOptions`.
3. Support drag-and-drop (`@hello-pangea/dnd` or HTML5 Drag and Drop) to advance candidate stages.
4. If a target stage requires prerequisites (e.g. scheduling details for `Interview Scheduled` or task details for `Technical Assessment`), intercept drop action and launch `AddStatusModal` prefilled with the target status.
5. Display age-in-stage badges on cards with visual alerts when a candidate is stagnant for > 5 business days.

**Expected User Benefit:**  
Reduces clicks, enhances spatial overview, and accelerates daily recruitment standups and candidate reviews.

**Business Benefit:**  
Decreases candidate drop-off by highlighting stalled applications.

**Implementation Notes:**  
- Endpoint `GET /api/candidates/board?roleId=...` returning candidates grouped by status column.
- Optimistic UI updates with TanStack Query mutations and rollback on error.

**Dependencies:**  
`CandidatesController`, `CandidateService.ValidateStatusChangeAsync`.

**Acceptance Criteria:**  
- Toggle between Table and Board views preserves active filters in URL query params.
- Dragging candidate between valid status stages updates database and updates board state smoothly.
- Invalid status transitions trigger a clear validation toast without moving the card.

---

### Feature: Full-Text Resume Search & Indexing
**Category:** Missing Feature / Productivity  
**Priority:** P0  
**Impact:** Critical  
**Effort:** Medium  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
`CVParserService` extracts text from uploaded PDF/Word files to populate initial drafts, but immediately discards the raw text. Search is limited to candidate names, emails, and phone numbers. Past candidates with niche technical skills or specific past employers cannot be found.

**Recommendation:**  
1. Add a `RawText` column (`longtext`) to `CVFiles` and persist the full parsed resume text upon upload.
2. Create a backfill migration or admin maintenance task to re-extract raw text from existing files on disk in `Uploads/`.
3. Add MySQL `FULLTEXT` index on `CVFiles(RawText)` and `Candidates(Skills, Summary)`.
4. Update `GET /api/candidates` search parameter to support boolean text queries (e.g. `Python AND (Kubernetes OR Docker)`).
5. In Candidate Detail CV viewer, highlight matching search query terms.

**Expected User Benefit:**  
Recruiters can instantly rediscover qualified talent from historical applicant pools without re-reading hundreds of files.

**Business Benefit:**  
Dramatically cuts cost-per-hire by unlocking internal candidate database sourcing.

**Implementation Notes:**  
- Migration `AddRawTextToCVFiles` with full-text indexing.
- Use `EF.Functions.Match` or MySQL `MATCH(...) AGAINST(... IN BOOLEAN MODE)`.

**Dependencies:**  
`CVParserService`, `CVFiles` entity, `CandidateService`.

**Acceptance Criteria:**  
- Uploading a PDF/Word file saves the complete extracted text into `CVFiles.RawText`.
- Searching for a term found only inside a candidate's CV returns that candidate in `/candidates`.
- Search response indicates whether the match occurred in Profile Fields or CV Document text.

---

### Feature: Candidate Side-by-Side Comparison Matrix
**Category:** New Feature / Productivity  
**Priority:** P1  
**Impact:** High  
**Effort:** Medium  
**User Value:** High  
**Business Value:** Medium  

**Current Problem:**  
When hiring managers select a finalist among 2–4 candidates for an open position, they must open multiple browser tabs to compare evaluation scorecards, criterion averages, experience, and recruiter notes.

**Recommendation:**  
Create a dedicated **Candidate Comparison View** (`/candidates/compare?ids=12,15,19`):
1. Support multi-selection checkbox on candidate list with a floating action bar button: `Compare Candidates (2-4)`.
2. Side-by-side comparison grid displaying:
   - Profile summary (Current Title, Relevant Experience, Skills, Source, Education).
   - Aggregated interview scores (Overall Rating, Section A-D breakdown, Recommendation tally).
   - Criterion-by-criterion side-by-side score comparison with visual bar differentials.
   - Key interviewer quotes and general assessment highlights.
3. Export / Print feature formatted for executive hiring committee review.

**Expected User Benefit:**  
Empowers hiring managers and interview panels to make objective, data-backed final hiring decisions in minutes.

**Business Benefit:**  
Minimizes hiring bias and standardizes executive review meetings.

**Implementation Notes:**  
- Endpoint `GET /api/candidates/compare?ids=1,2,3` leveraging existing `InterviewService.GetCandidateEvaluationReportAsync`.
- Responsive matrix table with sticky column headers and candidate avatars.

**Dependencies:**  
`InterviewService`, `CandidatesPage`, `CandidateEvaluationReport`.

**Acceptance Criteria:**  
- Selecting 2 to 4 candidates on `/candidates` enables the "Compare" action.
- Navigating to `/candidates/compare` renders a side-by-side rubric matrix.
- Print stylesheet formats comparison onto a clean executive PDF.

---

### Feature: Customizable Evaluation Rubrics per Job Opening
**Category:** Architecture / Core Feature  
**Priority:** P1  
**Impact:** High  
**Effort:** Large  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
The evaluation rubric is hardcoded to 12 fixed criteria across 4 static sections (A: Background, B: Technical, C: Soft Skills, D: Cultural Fit). An Engineering Manager and a Sales Executive cannot be evaluated on the same rubric.

**Recommendation:**  
1. Introduce configurable `EvaluationRubrics` and `RubricCriteria` models.
2. Allow Admins in Configuration to create custom Rubric Templates (e.g. "Senior Software Engineer", "Product Manager", "Enterprise Account Executive").
3. Associate each `RoleAppliedOption` (Job Opening) with a specific `EvaluationRubricId` (defaulting to Standard Rubric).
4. Dynamic `EvaluationForm` rendering the active criteria configured for the candidate's applied role.
5. Store scores flexibly referencing `RubricCriterionId`.

**Expected User Benefit:**  
Interviewers evaluate candidates on exact role-relevant competencies rather than arbitrary generic categories.

**Business Benefit:**  
Standardizes competency-based hiring across diverse business departments.

**Implementation Notes:**  
- Migration `AddCustomEvaluationRubrics` with backward compatibility mapping existing 12 keys into a default seeded rubric.
- Maintain submit-gate validation ensuring all active rubric criteria are rated before submission.

**Dependencies:**  
`ConfigurationService`, `InterviewService`, `EvaluationForm`.

**Acceptance Criteria:**  
- Admin can create a custom rubric with custom sections and weighted criteria in Configuration.
- Linking a role to a custom rubric updates the interview evaluation form for all candidates under that opening.
- Evaluation reports compute averages based on the role's assigned rubric.

---

## 8. New Feature Suggestions

### Feature: External Candidate Communication & Email Messaging Hub
**Category:** New Feature / Missing Feature  
**Priority:** P0  
**Impact:** Critical  
**Effort:** Large  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
Recruitment Gorilla only sends notifications internally to colleagues. All candidate communications (interview invitations, assessments, updates, rejections) must be conducted manually through external personal email clients.

**Recommendation:**  
Build a centralized **Candidate Communication Center**:
1. **Customizable Email Templates:** Manage email templates in Configuration with dynamic merge tags (`{{candidate_name}}`, `{{role_title}}`, `{{interview_datetime}}`, `{{company_name}}`, `{{recruiter_name}}`).
2. **Transactional Trigger Emails:**
   - *Application Received Confirmation* (automatic upon creation).
   - *Technical Assessment Dispatch* (includes task details and submission URL).
   - *Interview Invitation & Calendar Invite* (sent to candidate with meeting link).
   - *Professional Status Update / Rejection Notice* (with polite templated messaging).
3. **Candidate Email History Tab:** On `CandidateDetailPage`, display an interactive chronological log of all sent emails with delivery status.

**Expected User Benefit:**  
Saves recruiters 5–10 hours per week in manual email drafting and prevents candidate ghosting.

**Business Benefit:**  
Significantly elevates the employer brand and candidate experience.

**Implementation Notes:**  
- Extend `EmailService` to support templated candidate emails using Razor / Scriban or lightweight regex token replacement.
- Store outbound communications in a `CandidateEmails` entity (`CandidateId`, `SenderUserId`, `Subject`, `Body`, `SentAt`, `Status`).

**Dependencies:**  
`EmailService`, `IEmailSettingsResolver`, `CandidateDetailPage`.

**Acceptance Criteria:**  
- Recruiter can trigger customized emails from candidate timeline or status modal.
- Email uses configured SMTP credentials and logs to candidate history.
- Rejection email template auto-populates candidate name and role title.

---

### Feature: Public Careers Portal & External Application Intake
**Category:** New Feature  
**Priority:** P2  
**Impact:** High  
**Effort:** Large  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
`RoleAppliedOption` acts as a job opening, but there is no public-facing endpoint or UI where applicants can view active vacancies and submit applications.

**Recommendation:**  
1. **Public Job Board Route (`/careers`):** A branded, clean public page displaying all active job openings (`IsActive == true && EndDate >= now`).
2. **Job Detail & Application Form:** Candidates can view job descriptions, requirements, department, and location, and submit their CV (PDF/Word), contact details, LinkedIn URL, and portfolio.
3. **Application Intake API (`POST /api/public/apply`):** Rate-limited public endpoint with CAPTCHA / anti-spam validation that parses the CV, creates a candidate in `Uploaded` status with `Source = "Careers Page"`, and notifies assigned recruiters.
4. **Embeddable Job Widget:** Lightweight iframe or JavaScript snippet allowing marketing websites to embed the job list.

**Expected User Benefit:**  
Eliminates manual CV forwarding and enables direct candidate self-application.

**Business Benefit:**  
Transforms Recruitment Gorilla from an internal back-office tracker into a complete applicant acquisition engine.

**Implementation Notes:**  
- Create dedicated `PublicJobsController` with `[AllowAnonymous]` and strict IP rate-limiting.
- Store job descriptions in markdown format on `RoleAppliedOption`.

**Dependencies:**  
`RoleAppliedOption`, `CVParserService`, `CandidateService`.

**Acceptance Criteria:**  
- Unauthenticated visitors can view open jobs at `/careers`.
- Submitting an application creates a candidate record and triggers recruiter notification.
- Expired or closed job openings automatically disappear from public view.

---

### Feature: Recruiter Global Command Palette (`Cmd+K` / `Ctrl+K`)
**Category:** Productivity Improvement  
**Priority:** P2  
**Impact:** Medium  
**Effort:** Small  
**User Value:** High  
**Business Value:** Medium  

**Current Problem:**  
Navigating between candidates, openings, configurations, and audit logs requires multiple mouse clicks and navigation bar drill-downs.

**Recommendation:**  
Introduce a keyboard-first **Command Palette** accessible via `Cmd+K` (macOS) or `Ctrl+K` (Windows/Linux):
1. **Instant Search:** Search candidates by name, email, or phone number with instant dropdown results.
2. **Quick Navigation:** Jump directly to any page (`/dashboard`, `/candidates`, `/upload`, `/configuration?tab=skills`, `/audit`).
3. **Quick Actions:** "Upload new CVs", "Schedule Interview", "Toggle Theme", "Change Password".

**Expected User Benefit:**  
Power users and daily recruiters can navigate the entire ATS in milliseconds without touching a mouse.

**Business Benefit:**  
Dramatically enhances perceived platform quality and recruiter productivity.

**Implementation Notes:**  
- Implement using `cmdk` or custom accessible dialog in `client/src/components/shell/CommandPalette.tsx`.
- Connect to lightweight backend debounced search `GET /api/candidates/quick-search?q=...`.

**Dependencies:**  
`AppShell`, `services/api.ts`.

**Acceptance Criteria:**  
- Pressing `Cmd+K` or `Ctrl+K` anywhere in the authenticated application opens the command modal.
- Typing a candidate name reveals instant matches with avatar, status, and direct navigation links.
- Arrow keys and Enter allow full keyboard-only navigation.

---

## 9. AI & Automation Opportunities

### Feature: GenAI Structured Resume Parser & Extraction Engine
**Category:** AI Opportunity / Core Improvement  
**Priority:** P1  
**Impact:** Critical  
**Effort:** Medium  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
`CVParserService` relies on regex heuristics and font-casing rules. Complex resume formats (multi-column tables, infographics, non-standard headings, international phone numbers, and mixed date layouts) cause missed names, incorrect experience numbers, and missing skills.

**Recommendation:**  
Augment the intake pipeline with an **LLM-Powered Resume Parsing Engine** (supporting OpenAI, Anthropic Claude, or local Ollama endpoints):
1. Extract raw document text via PdfPig / OpenXml.
2. Dispatch prompt with JSON Schema enforcing structured output:
   - Full Name, Email, Phone, Location.
   - LinkedIn, GitHub, Portfolio URLs.
   - Standardized Years of Experience calculation.
   - Work Experience History (Company, Title, Start Date, End Date, Summary).
   - Education (Institution, Degree, Field, Year).
   - Technical & Soft Skills list.
3. Automatically match parsed skills against existing `SkillOptions` in database and suggest new skill tags.
4. Fall back seamlessly to local regex parser if AI service is disabled or offline.

**Expected User Benefit:**  
95%+ extraction accuracy, zero manual data re-typing, and automatic work history extraction.

**Business Benefit:**  
Cuts CV review time per candidate from 3 minutes to under 30 seconds.

**Implementation Notes:**  
- Implement `IAiParserService` with structured JSON output schema validation.
- Configurable in Configuration → AI Settings (API key, model selection, temperature).
- Retain human-in-the-loop review in `UploadPage` before final persistence.

**Dependencies:**  
`CVParserService`, `UploadPage`, `ConfigurationService`.

**Acceptance Criteria:**  
- Uploaded CV draft automatically extracts structured work history and skills.
- Skills matching configured lookups are automatically pre-selected.
- Parsing failure gracefully falls back to regex parser with user warning.

---

### Feature: AI Candidate-to-Job Semantic Match & Fit Scoring
**Category:** AI Opportunity  
**Priority:** P2  
**Impact:** High  
**Effort:** Medium  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
Recruiters must manually read every CV to determine if the candidate meets the core technical and seniority requirements of an open role.

**Recommendation:**  
Implement an **AI Job Match Score** (0–100%):
1. Compare the candidate's CV text and work history against the applied `RoleAppliedOption` requirements.
2. Generate an objective breakdown:
   - **Overall Match Score** (e.g. `87% Match`).
   - **Key Strengths** (e.g., "5+ years .NET 10 experience, strong MySQL tuning background").
   - **Skill Gaps / Red Flags** (e.g., "No Kubernetes production experience mentioned").
   - **Suggested Interview Focus Areas** (e.g., "Probe system design experience under high concurrency").
3. Display match badge on candidate list, Kanban board, and candidate detail hero.

**Expected User Benefit:**  
Instantly identifies top-tier applicants in high-volume queues (100+ applicants).

**Business Benefit:**  
Accelerates initial screening triage and standardizes candidate qualification criteria.

**Implementation Notes:**  
- Compute score asynchronously upon candidate creation to prevent blocking HTTP uploads.
- Store summary in `Candidate.AiAnalysisJson`.

**Dependencies:**  
`CVFiles.RawText`, `RoleAppliedOptions`, `CandidateService`.

**Acceptance Criteria:**  
- Candidate profile shows an expandable "AI Fit Analysis" card with score and key strengths.
- Recruiter can filter candidate list by `Min Match Score: 80%`.

---

## 10. Security & Reliability Improvements

### Feature: Authentication Hardening & Rate Limiting (Brute-Force Protection)
**Category:** Security Improvement  
**Priority:** P0  
**Impact:** Critical  
**Effort:** Small  
**User Value:** Medium  
**Business Value:** High  

**Current Problem:**  
`POST /api/auth/login` has no rate limiting or failed attempt tracking. A malicious actor can execute automated password dictionary attacks against user accounts.

**Recommendation:**  
1. **ASP.NET Core Rate Limiting:** Implement fixed/sliding window rate limiting on `/api/auth/login` (e.g., maximum 5 attempts per minute per IP address).
2. **Account Lockout Policy:** Temporarily lock user account for 15 minutes after 5 consecutive failed login attempts.
3. **Audit Log Security Alert:** Record `Auth.AccountLocked` in audit log and notify SuperAdmin.
4. **Password Complexity Policy:** Enforce minimum 10 characters, including uppercase, lowercase, numeric, and special character on create and reset.

**Expected User Benefit:**  
Protects recruiter and candidate data against unauthorized access and account takeovers.

**Business Benefit:**  
Ensures compliance with enterprise cybersecurity requirements and SOC 2 / ISO 27001 standards.

**Implementation Notes:**  
- Use `Microsoft.AspNetCore.RateLimiting` middleware configured in `Program.cs`.
- Add `AccessFailedCount` and `LockoutEndUtc` columns to `Users` entity.

**Dependencies:**  
`AuthController`, `AuthService`, `Users` entity.

**Acceptance Criteria:**  
- Exceeding 5 failed login attempts returns HTTP 429 / lockout message.
- Successful login resets failed attempt counter.
- Audit log records all lockout occurrences.

---

### Feature: GDPR Compliance, Data Retention Policies & RTBF
**Category:** Security / Compliance  
**Priority:** P1  
**Impact:** Critical  
**Effort:** Medium  
**User Value:** Medium  
**Business Value:** High  

**Current Problem:**  
Candidate personal data (PII) and CV documents are stored indefinitely. There is no automated retention policy, candidate consent tracking, or exportable Right-to-be-Forgotten (RTBF) pipeline.

**Recommendation:**  
1. **Automated Data Retention Policy:** Configurable retention threshold in Configuration (e.g., 6, 12, or 24 months after last activity).
2. **Compliance Maintenance Job:** Background worker flagging candidates exceeding retention deadline and providing a 1-click batch purge or auto-anonymize.
3. **Right to Be Forgotten (RTBF) Tool:** Anonymize candidate PII (replacing Name/Email/Phone with hashed identifiers) while preserving anonymized statistics in `StatusHistory` for reporting integrity.
4. **Data Subject Access Request (DSAR) Export:** Export all data held on a candidate into a standardized, password-protected ZIP archive containing JSON profile, history, evaluations, and original CV files.

**Expected User Benefit:**  
Provides legal compliance confidence when handling European, UK, and North American applicant data.

**Business Benefit:**  
Eliminates legal liability and GDPR/CCPA regulatory fines.

**Implementation Notes:**  
- Endpoint `POST /api/candidates/{id}/anonymize` (Admin+ only).
- Endpoint `GET /api/candidates/{id}/export-data` returning structured ZIP stream.

**Dependencies:**  
`CandidatesController`, `CandidateService`, `AuditService`.

**Acceptance Criteria:**  
- Admin can run an anonymization command that purges CV files and hashes candidate PII.
- Candidate export produces a comprehensive JSON + CV zip file.
- Retention report highlights candidates overdue for compliance review.

---

## 11. Performance Improvements

### Feature: Asynchronous Background Job Processing & Queue Architecture
**Category:** Performance Improvement / Architecture  
**Priority:** P1  
**Impact:** High  
**Effort:** Medium  
**User Value:** High  
**Business Value:** High  

**Current Problem:**  
Email dispatching, PDF calendar generation, large CV parsing, and audit writing are executed synchronously inside API request threads. A slow SMTP server or large PDF file slows down HTTP response times.

**Recommendation:**  
1. Introduce a lightweight background job processing layer using **Channels** / **BackgroundService** or **Hangfire**.
2. Decouple transactional email delivery: API writes email request to queue and returns immediate `200 OK` to browser.
3. Decouple audit logging into an asynchronous buffered channel batch writer.
4. Process large batch CV parsing asynchronously with real-time progress updates via WebSockets (SignalR).

**Expected User Benefit:**  
Near-instantaneous UI responses (<100ms) when scheduling interviews, changing statuses, or uploading files.

**Business Benefit:**  
Increases server concurrency and prevents API thread pool starvation.

**Implementation Notes:**  
- Implement `System.Threading.Channels` bounded queue in ASP.NET Core.
- Background worker consumes queued messages with retry policies and exponential backoff.

**Dependencies:**  
`EmailService`, `AuditService`, `Program.cs`.

**Acceptance Criteria:**  
- Scheduling an interview returns immediately without waiting for external SMTP handshake.
- Failed email sends automatically retry up to 3 times in background.

---

### Feature: Cloud Object Storage Abstraction (S3 / Azure Blob Storage)
**Category:** Performance Improvement / Architecture  
**Priority:** P2  
**Impact:** High  
**Effort:** Medium  
**User Value:** Medium  
**Business Value:** High  

**Current Problem:**  
CV files are saved to local server disk (`server/Recruitment.Gorilla.API/Uploads/`). This creates a stateful API server, preventing multi-instance container scaling and risking data loss if containers are redeployed.

**Recommendation:**  
1. Create an `IFileStorageService` abstraction with implementations:
   - `LocalDiskStorageService` (default for local development).
   - `S3StorageService` (AWS S3, MinIO, Cloudflare R2).
   - `AzureBlobStorageService` (Azure Blob).
2. Configure storage driver via `appsettings.json` / environment variables.
3. Stream file downloads via pre-signed URLs or authorized API gateway proxy.

**Expected User Benefit:**  
High reliability and fast global document previews.

**Business Benefit:**  
Enables true multi-node horizontal scaling in cloud container environments.

**Implementation Notes:**  
- Implement interface `Task<string> SaveAsync(Stream stream, string fileName)` and `Task<Stream> GetAsync(string key)`.

**Dependencies:**  
`CVUploadController`, `CandidateService.GetCvFileAsync`.

**Acceptance Criteria:**  
- Switching configuration from `Local` to `S3` routes file writes and reads to S3 bucket seamlessly.
- Candidate deletion removes objects from cloud bucket.

---

## 12. Accessibility Improvements

### Feature: WCAG 2.2 AA Accessibility & Screen Reader Audit
**Category:** Accessibility Improvement  
**Priority:** P1  
**Impact:** High  
**Effort:** Small  
**User Value:** High  
**Business Value:** Medium  

**Current Problem:**  
While Prism tokens maintain strong color contrast, dynamic UI components (the evaluation rubric segmented rating groups, custom dropdowns, and status modals) lack complete ARIA live regions and keyboard focus traps.

**Recommendation:**  
1. **ARIA Live Regions:** Add `aria-live="polite"` to dynamic result count updates, async toast alerts, and draft parsing progress.
2. **Keyboard Focus Trapping in Modals:** Ensure `AddStatusModal` and `ConfirmModal` trap focus properly with `Escape` key dismissal.
3. **Rating Scale Accessibility:** Ensure evaluation 1–5 segmented buttons have explicit `aria-label="Rating 4 of 5 for Technical Aptitude"` and respond to arrow key navigation (`Role="radiogroup"`).
4. **Skip Links & Landmarks:** Ensure `<main id="main-content">`, `<nav aria-label="Sidebar">`, and `<header>` landmarks are rigorously structured on every page.

**Expected User Benefit:**  
Enables seamless navigation for recruiters and interviewers using screen readers and keyboard-only devices.

**Business Benefit:**  
Ensures compliance with US Section 508, ADA Title III, and European Accessibility Act requirements.

**Implementation Notes:**  
- Test with NVDA / VoiceOver and axe-core accessibility automated linters.

**Dependencies:**  
`EvaluationForm.tsx`, `AppShell.tsx`, `AddStatusModal`.

**Acceptance Criteria:**  
- Zero violations on automated Axe / Lighthouse accessibility audits.
- Full interview evaluation can be completed using keyboard Tab, Arrow keys, and Space/Enter alone.

---

## 13. Technical Debt & Architecture Improvements

### Feature: Database Cleanup & Typo Migration ("Submission Receieved")
**Category:** Technical Debt  
**Priority:** P0  
**Impact:** Medium  
**Effort:** Small  
**User Value:** Low  
**Business Value:** Medium  

**Current Problem:**  
The status `"Submission Receieved"` contains a spelling typo that is hardcoded across database seed migrations, `CandidateService.cs`, `CandidateBuckets.cs`, and frontend status color maps.

**Recommendation:**  
1. Create an EF Core migration `FixSubmissionReceivedTypo` updating database rows in `StatusOptions`, `StatusTransitions`, `Candidates.CurrentStatus`, and `StatusHistories.Status`.
2. Refactor all C# backend string constants to `"Submission Received"`.
3. Update frontend lookup maps and status styles.

**Expected User Benefit:**  
Eliminates noticeable UI spelling error on candidate timeline and status dropdowns.

**Business Benefit:**  
Eliminates code confusion and prevents future data synchronization errors.

**Implementation Notes:**  
- Migration must execute safe SQL: `UPDATE StatusOptions SET Name = 'Submission Received' WHERE Name = 'Submission Receieved';` across all linked tables.

**Dependencies:**  
`AppDbContext`, `CandidateService`, `statusColors.ts`.

**Acceptance Criteria:**  
- All existing and new candidate records display the correctly spelled "Submission Received".
- No broken status transitions or color badge mismatches.

---

## 14. Feature Prioritization Matrix

| Feature | Category | Priority | Impact | Effort | User Value | Business Value | Target Phase |
|---|---|---|---|---|---|---|---|
| **Submission Received Typo Fix** | Technical Debt | **P0** | Medium | Small | Medium | Medium | Phase 1 |
| **Auth Rate Limiting & Lockout** | Security | **P0** | Critical | Small | High | High | Phase 1 |
| **Full-Text Resume Search** | Missing Feature | **P0** | Critical | Medium | High | High | Phase 1 |
| **Candidate Comms & Email Hub** | Core Feature | **P0** | Critical | Large | High | High | Phase 1 & 2 |
| **Kanban Visual Pipeline Board** | UX Improvement | **P0** | Critical | Medium | High | High | Phase 2 |
| **Offer Stage & Pipeline Extension** | Core Feature | **P0** | Critical | Large | High | High | Phase 3 |
| **Candidate Comparison Matrix** | Productivity | **P1** | High | Medium | High | Medium | Phase 2 |
| **GDPR Compliance & RTBF Tool** | Security / Legal | **P1** | Critical | Medium | Medium | High | Phase 2 |
| **Custom Evaluation Rubrics** | Core Feature | **P1** | High | Large | High | High | Phase 3 |
| **GenAI Structured CV Parser** | AI Opportunity | **P1** | Critical | Medium | High | High | Phase 3 |
| **Asynchronous Job Worker (Queue)** | Performance | **P1** | High | Medium | High | High | Phase 2 |
| **WCAG 2.2 AA Accessibility** | Accessibility | **P1** | High | Small | High | Medium | Phase 1 |
| **Recruiting Analytics (Velocity/Funnel)** | Analytics | **P1** | High | Medium | High | High | Phase 3 |
| **Public Careers Portal & Intake API**| New Feature | **P2** | High | Large | High | High | Phase 4 |
| **Global Command Palette (`Cmd+K`)** | Productivity | **P2** | Medium | Small | High | Medium | Phase 2 |
| **Cloud Object Storage (S3/Azure)** | Architecture | **P2** | High | Medium | Medium | High | Phase 4 |
| **2-Way Calendar Availability Sync** | Automation | **P2** | High | Large | High | High | Phase 4 |
| **AI Candidate-to-Job Matching** | AI Opportunity | **P2** | High | Medium | High | High | Phase 4 |
| **Two-Factor Authentication (2FA)** | Security | **P2** | High | Medium | High | High | Phase 3 |
| **Automated CSV/Excel Data Export** | Productivity | **P3** | Medium | Small | High | Medium | Phase 2 |

---

## 15. Quick Wins

High-impact, low-effort improvements that can be executed immediately:

1. **Fix `"Submission Receieved"` Typo:** 1-day database migration and code constant refactoring.
2. **Implement Login Rate Limiting:** Add ASP.NET Core `RateLimiter` middleware in `Program.cs` to prevent brute force attacks.
3. **Persist `RawText` on CV Upload:** Save extracted text into `CVFiles.RawText` and add full-text database indexing for immediate search capabilities.
4. **Command Palette (`Cmd+K`):** Implement client-side modal with instant keyboard navigation across pages and search queries.
5. **CSV Export on Candidates & Audit Pages:** Add lightweight client-side/server-side CSV export button for candidate lists and audit logs.
6. **Password Policy Enforcement:** Validate 10+ character complexity on user creation and self-service password reset.

---

## 16. Major Redesign Candidates

### Summary of Major Architectural & UI Redesigns

```
┌──────────────────────────────────────────┐     ┌──────────────────────────────────────────┐
│   1. DUAL-MODE CANDIDATE PIPELINE        │     │   2. BATCH INTAKE STUDIO                 │
│   - Switch between Table & Kanban Board  │     │   - Split-screen verification workspace  │
│   - Drag-and-drop status transitions     │     │   - Batch role & source assignment       │
│   - Age-in-stage bottleneck indicators   │     │   - Resilient background upload queue    │
└──────────────────────────────────────────┘     └──────────────────────────────────────────┘
                         ▲                                            ▲
                         └──────────────────────┬─────────────────────┘
                                                │
┌───────────────────────────────────────────────┴───────────────────────────────────────────┐
│   3. CANDIDATE TABBED WORKSPACE & COMPARISON MATRIX                                       │
│   - Tabbed detail: Profile/CV, Timeline, Scorecards, Candidate Emails, Document Library   │
│   - Side-by-side 4-candidate comparison grid with rubric differentials                    │
└───────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 17. Implementation Roadmap

### Phase 1 — Critical Fixes, Security & Quick Wins (Weeks 1–3)
**Goal:** Address fundamental security vulnerabilities, fix technical debt typos, enhance accessibility, and persist full-text CV search data.
1. **Migration & Typo Fix:** Resolve `"Submission Receieved"` across DB and C# constants.
2. **Auth Hardening:** Implement ASP.NET Core IP rate limiting, account lockout after 5 failed attempts, and password complexity rules.
3. **Raw CV Text Storage & Full-Text Search:** Update `CVFiles` schema to persist extracted text; add full-text query capabilities.
4. **Accessibility Pass:** Update focus management, live regions, and evaluation radio accessibility.
5. **Global Command Palette (`Cmd+K`):** Deliver keyboard-driven search and navigation.

### Phase 2 — UX/UI Modernization & Communication Hub (Weeks 4–7)
**Goal:** Transform the candidate management workflow with visual Kanban boards, multi-candidate comparison, and candidate email communications.
1. **Interactive Visual Pipeline (Kanban Board):** Deliver dual-mode Table/Kanban toggle with drag-and-drop status advancement.
2. **Candidate Email Communication Center:** Customizable email templates with merge tags, transactional trigger emails, and email history tab.
3. **Candidate Comparison Matrix:** Multi-select comparison view with side-by-side scorecards.
4. **Async Task Processing:** Introduce background channel queue for email sending and file processing.
5. **GDPR Tools:** Right-to-be-forgotten anonymization and data export utilities.

### Phase 3 — Core Feature Improvements & Advanced Analytics (Weeks 8–11)
**Goal:** Complete the full ATS pipeline with offer management, dynamic role rubrics, and executive recruiting velocity metrics.
1. **Offer Stage & Pipeline Extension:** Add Offer Preparation, Offer Extended, and Hired stages with compensation tracking.
2. **Customizable Evaluation Rubrics:** Role-specific scorecard configuration and dynamic evaluation forms.
3. **Recruiting Velocity Analytics:** Deliver Time-to-Hire, Time-in-Stage Bottlenecks, Funnel Conversion, and Source ROI dashboards.
4. **Two-Factor Authentication (2FA / TOTP):** Optional authenticator app MFA for Admin and SuperAdmin users.
5. **GenAI Resume Parser Integration:** Structured AI resume extraction supporting work history and automatic skill matching.

### Phase 4 — Automation, Sourcing & Cloud Infrastructure (Weeks 12–16)
**Goal:** Expand recruitment reach with public job boards, calendar sync, cloud storage, and AI candidate matching.
1. **Public Careers Portal & Application Intake API:** Branded `/careers` page with embeddable application widget.
2. **Two-Way Calendar Sync:** Google Calendar / Microsoft Outlook real-time interviewer availability and meeting generation.
3. **Cloud Object Storage:** S3 / Azure Blob Storage provider implementation for stateless multi-instance scaling.
4. **AI Candidate-to-Job Fit Scoring:** Semantic matching scoring candidate qualifications against job requirements.

### Phase 5 — Next-Level Enterprise Capabilities (Future Initiatives)
**Goal:** Enterprise multi-tenancy, compliance integrations, and automated sourcing pipelines.
1. **Multi-Tenancy & Departmental Scoping:** Separate business units, brands, and department sub-organizations.
2. **Background Check & E-Signature Integrations:** Direct webhook connections to DocuSign/Checkr.
3. **Candidate Self-Scheduling Portal:** Candidates select preferred interview slots from interviewer availability calendar.
4. **Automated WhatsApp / SMS Interview Reminders:** Multi-channel applicant engagement.

---

## 18. Dependencies & Risks

| Initiative | Key Dependencies | Potential Risk / Challenge | Mitigation Strategy |
|---|---|---|---|
| **Full-Text CV Search** | MySQL 8+ Fulltext or Lucene index | Large PDF files might produce heavy database storage or slow search queries | Truncate raw text to 500KB max per document; add debounce and paging to search endpoints. |
| **Kanban Pipeline Board** | `CandidateService.ValidateStatusChangeAsync` | Dropping card into stage with missing prerequisite data (e.g. interview date) | Intercept drop event and open prerequisite modal before committing status change. |
| **Candidate Emailing** | SMTP Configuration / SendGrid API | Outbound emails marked as spam or failing delivery | Support DKIM/SPF verification guides; handle email failures via async retries and clear audit logs. |
| **Custom Rubrics** | `InterviewEvaluations` schema migration | Breaking historical 12-criterion evaluation scores | Map legacy criterion keys into a permanent "Default Standard Rubric" with seed migration. |
| **GenAI CV Parsing** | OpenAI / Claude API Keys | API latency or token cost spikes on high-volume bulk uploads | Maintain local regex parser fallback; cache parsed results; allow batch throttles. |

---

## 19. Recommended Design Principles

To ensure Recruitment Gorilla maintains its premium, focused, and cohesive identity, all future developments must adhere to these five core principles:

1. **Uncompromising Visual Hierarchy & Spacing Discipline:**  
   Always build with the **Prism Design System** tokens. Use `.page-stack` vertical spacing (`--stack-gap`), flat cards (`--radius-card`, no heavy box shadows), cohesive light/dark tokens, and zero hardcoded colors.
2. **Zero Dead Ends & Complete Feedback Loops:**  
   Every state must have a clear next action. Empty states guide the user on how to populate data. Loading states hold layout shape with skeletons. Error states provide actionable retry buttons.
3. **Contextual Action Placement:**  
   Actions belong near the content they modify (`.page-bar`, row action clusters). Do not place page-specific action buttons in the global topbar.
4. **Optimistic & Resilient Workflows:**  
   Perform UI updates optimistically with TanStack Query where safe. Never discard uncommitted user inputs on network disconnect or accidental tab reload.
5. **Security & Privacy by Default:**  
   Enforce default-deny authorization on all backend endpoints. Protect candidate PII, encrypt secrets at rest, and audit every sensitive transaction.

---

## 20. Final Top 20 Recommendations

Here are the **Top 20 highest-value improvements** that will transform Recruitment Gorilla into an enterprise-grade recruitment powerhouse:

1. **Fix `"Submission Receieved"` Typo:** Clean up database seeds and code constants for professional polish.
2. **Implement Login Rate Limiting & Account Lockout:** Secure the platform against brute-force attacks.
3. **Full-Text Resume Search & Indexing:** Enable recruiters to search full CV text across all past applicants.
4. **Dual-Mode Kanban Visual Pipeline Board:** Enable drag-and-drop visual pipeline management on the candidate list.
5. **Candidate Communication & Email Hub:** Send templated interview invites, task assignments, and updates directly to applicants.
6. **Offer Stage & Pipeline Extension to Hire:** Complete the recruitment lifecycle through offer generation, negotiation, and hiring.
7. **Candidate Side-by-Side Comparison Matrix:** Compare 2–4 candidates on evaluation rubrics and experience in an executive view.
8. **GenAI Structured CV Parsing:** Automate extraction of work history, education, and skills with 95%+ precision.
9. **Role-Specific Custom Evaluation Rubrics:** Create tailored scorecard criteria per job opening.
10. **Recruiting Velocity & Funnel Analytics:** Track Time-to-Hire, Stage Bottlenecks, and Sourcing Channel conversion rates.
11. **GDPR Compliance Tools & Right to Be Forgotten:** Implement automated retention policies, PII anonymization, and DSAR export.
12. **Asynchronous Background Processing Queue:** Ensure zero-latency HTTP responses for email dispatch and audit logging.
13. **Two-Way Calendar Sync & Candidate Self-Scheduling:** Direct Google/Outlook availability lookups and self-booking links.
14. **Public Careers Portal & Application Intake:** Enable candidates to apply directly via `/careers` or embeddable widgets.
15. **Global Command Palette (`Cmd+K`):** Provide keyboard-first search and navigation across the ATS.
16. **Cloud Object Storage Driver (S3 / Azure Blob):** Enable stateless container deployments with cloud asset storage.
17. **AI Candidate-to-Job Fit Scoring:** Automatically highlight top candidates matching job requirements.
18. **Two-Factor Authentication (2FA / TOTP):** Secure recruiter accounts with authenticator apps.
19. **Batch Resume Verification Studio:** Split-screen batch upload review workspace with bulk role assignment.
20. **Automated CSV/Excel Report Exporters:** One-click export for candidates, pipeline analytics, and audit logs.

---
*End of Document. Generated for Recruitment Gorilla Project Roadmap.*
