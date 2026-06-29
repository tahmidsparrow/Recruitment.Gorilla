# Spec — Candidate Notes (worked example)

**Status:** Example (illustrative — not necessarily implemented)
**Author:** docs
**Date:** 2026-06-29

> This is a teaching example showing the spec template filled in and mapped to the
> [feature-playbook.md](../feature-playbook.md) steps. It exercises the full stack
> (entity → migration → service → controller → api → UI) so a new agent can see the
> end-to-end flow. Treat it as a reference, not a commitment.

## 1. Summary
Let the admin attach free-text **notes** to a candidate (e.g. interview impressions), shown on the candidate detail page, newest first.

## 2. Motivation
Recruiters need a lightweight place to jot context that isn't a formal status change. Status history is for pipeline state; notes are informal commentary.

## 3. Scope
**In scope:** add a note, list notes for a candidate, delete a note. Notes are append-style with author + timestamp.
**Out of scope:** editing a note, mentions, attachments, rich text.

## 4. Data model changes
New entity **`CandidateNote`** (`CandidateNotes` table), child of `Candidate` (cascade delete):

| Field | Type | Notes |
|---|---|---|
| Id | int PK | |
| CandidateId | int FK → Candidate | cascade |
| Body | text | required |
| CreatedBy | varchar(200) | required; admin name |
| CreatedAt | datetime | UTC |

`AppDbContext`: add `DbSet<CandidateNote>`, Fluent config (required `Body`/`CreatedBy` with max length on `CreatedBy`, FK cascade). Migration: `AddCandidateNotes`.

## 5. API contract
| Method | Route | Auth | Request | Response | Notes |
|---|---|---|---|---|---|
| GET | `/api/candidates/{id}/notes` | required | — | `NoteDto[]` | newest first |
| POST | `/api/candidates/{id}/notes` | required | `CreateNoteDto { body, createdBy }` | `NoteDto` | 404 if candidate missing |
| DELETE | `/api/candidates/{id}/notes/{noteId}` | required | — | `204` | 404 if not found |

DTOs (records in `DTOs/`): `CreateNoteDto(string Body, string CreatedBy)`, `NoteDto(int Id, string Body, string CreatedBy, DateTime CreatedAt)`.

## 6. Backend design
Add methods to `CandidateService` (notes belong to candidates):
- `GetNotesAsync(int candidateId)` → `List<NoteDto>` ordered by `CreatedAt` desc.
- `AddNoteAsync(int candidateId, CreateNoteDto dto)` → `NoteDto?` (null if candidate missing).
- `DeleteNoteAsync(int candidateId, int noteId)` → `bool`.
Controller actions on `CandidatesController` map results to `Ok`/`NotFound`/`NoContent`. Log add/delete with `ILogger`. No `CurrentStatus`-style denormalization needed.

## 7. Frontend design
- `types/index.ts`: `Note` and `CreateNotePayload` interfaces (mind camelCase: `createdBy`, `createdAt`).
- `services/api.ts`: `getNotes(id)`, `addNote(id, payload)`, `deleteNote(id, noteId)`.
- `CandidateDetailPage`: a "Notes" card — `useQuery(['candidate', id, 'notes'])` to list, a small add-note form (`useMutation`, invalidate the notes key), and per-note delete with a confirm modal. Theme-consistent (reuse the existing card/timeline styling).

## 8. Security & auth
All endpoints require auth (default-deny + explicit `[Authorize]` on the controller). Validate `Body` non-empty server-side. Verify the note belongs to the given candidate before delete.

## 9. Acceptance criteria / verification
- [ ] `AddCandidateNotes` migration applies cleanly.
- [ ] `dotnet build` (API stopped) and `npx tsc -b` pass.
- [ ] Through the proxy: unauthorized → 401; add note → 200 + appears first; delete → 204 + disappears; bad candidate id → 404.
- [ ] Detail page lists notes newest-first; add/delete refresh the list; delete confirms.
- [ ] Audit lines for add/delete in the log.
- [ ] `ai-docs/data-model.md` and `ai-docs/backend.md` updated with the new entity/endpoints.

## 10. Open questions
- Should deleting a note be a soft delete for audit? (Default: hard delete, matching the candidate delete pattern.)
