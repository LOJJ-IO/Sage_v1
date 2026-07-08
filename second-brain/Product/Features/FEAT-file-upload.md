---
type: feature
status: in-progress
tags: [area/frontend, area/backend, area/product]
created: 2026-07-07
updated: 2026-07-08
related: ["[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]", "[[FEAT-app-shell-layout]]", "[[API-Documentation]]", "[[Database-Schema]]", "[[Lessons-Learned]]"]
---

# FEAT: File upload

## Status
`in-progress` — **in-memory prototype** in the shell UI (no API, no disk). FastAPI + Supabase pipeline not yet built.

## Problem
Admins need to populate the shared knowledge base with SOPs, policies, and product docs. The left file tree and center preview/tabs depend on real files existing. Upload is the entry point for the whole document workflow ([[Sage-MVP-Functional-Spec#4.6]]).

## Solution
Multi-file picker from global header **Upload** button and left-panel empty-state CTA. Client validates type/size. Accepted files held in React state (`LibraryFile[]` with native `File` objects) and shown in a flat left-panel list.

**Current (shell prototype):** `useFileLibrary` hook — `useState` only. **Lost on refresh.** No server.

**Target (MVP):** FastAPI validates → Supabase Storage → text extraction → auto-tags → `files` row ([[Sage-MVP-Functional-Spec#4.6]]).

## Supported file types (v1 decision)

| Type | Extensions | Text extraction (target) | Sage retrieval |
|---|---|---|---|
| PDF | `.pdf` | Yes | Content + tags |
| Word (modern) | `.docx` | Yes | Content + tags |
| Plain text | `.txt` | Yes | Content + tags |
| Markdown | `.md` | Yes | Content + tags |
| Images | `.jpg`, `.jpeg`, `.png`, `.webp`, `.gif` | No | Tags + filename only |

**Rejected for v1:** legacy `.doc` — different binary format; `python-docx` does not parse it. Show clear error: *"Legacy Word (.doc) is not supported — save as .docx."*

**Limits:** 25 MB per file ([[Sage-MVP-Functional-Spec#4.1]]).

Constants + client validation in `frontend/src/lib/file-upload.ts`.

## Out of scope (this iteration)
- Folder upload (`webkitdirectory`) — enumerate + skip-summary deferred
- Admin role enforcement (no auth yet)
- Text extraction, server-side auto-tags
- Center preview + tabs on file click
- Drag-and-drop onto center panel
- Per-business storage quotas (documented; not enforced in interim API)
- FastAPI + Supabase Storage

## UI/UX
- **Entry points:** global header Upload icon; left panel "Upload files" button when tree is empty.
- **Picker:** `<input type="file" multiple accept="...">` — OS grays unsupported types for file mode.
- **Feedback:** inline error banner for batch failures; skipped files listed in upload result.
- **After upload:** flat file list in left panel — Tabler `file-type-*` icon, filename, bookmark toggle, kebab (Edit tags / Replace / Delete). Delete + Edit tags use manage-team dialog pattern. In-memory only.
- Admin-only in production; all users see upload UI in shell prototype until auth ships.

## Technical approach

### Client only (current)
- `frontend/src/lib/file-upload.ts` — validation, `LibraryFile` (`tags`, `isBookmarked`)
- `frontend/src/hooks/use-file-library.ts` — add / replace / delete / tags / bookmark
- `frontend/src/components/files/` — `file-list`, `file-row-menu`, `file-bookmark-button`, `delete-file-dialog`, `edit-file-tags-dialog`, `file-type-icon`

### Target (FastAPI)
`POST /files` with server validation, storage, extraction. Replace in-memory state with API fetch + optimistic UI.

## Security (must hold in FastAPI)

See [[Lessons-Learned#2026-07-07 — File upload abuse surface]].

Minimum v1 defenses:
1. **Admin role check** on `POST /files` (when auth exists)
2. **Server-side validation** — never trust client `accept` or MIME
3. **UUID storage paths** — never use user filename in blob path
4. **Extraction limits** (FastAPI) — timeout, max extracted text length, max PDF pages
5. **Rate limit + storage quota** per business

Highest pilot risks: stolen admin PIN on shared tablet; prompt injection in uploaded doc text (trusted-admin model).

## Open questions
- [ ] Folder upload in v1.1 or with FastAPI backend?
- [ ] Open uploaded file in center tab automatically?
- [ ] Duplicate filename warning ([[Sage-MVP-Functional-Spec#4.6]]) — when manifest/DB exists

## Related
- [[Sage-MVP-Functional-Spec#4.1]], [[Sage-MVP-Functional-Spec#4.6]], [[Sage-MVP-Functional-Spec#4.8]]
- `frontend/src/lib/file-upload.ts`, `frontend/src/hooks/use-file-library.ts`
- [[API-Documentation#Files]]
