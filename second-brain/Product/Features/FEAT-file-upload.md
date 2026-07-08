---
type: feature
status: in-progress
tags: [area/frontend, area/backend, area/product]
created: 2026-07-07
updated: 2026-07-07
related: ["[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]", "[[FEAT-app-shell-layout]]", "[[API-Documentation]]", "[[Database-Schema]]", "[[Lessons-Learned]]"]
---

# FEAT: File upload

## Status
`in-progress` — client upload UI + interim Next.js API route shipped; FastAPI + Supabase pipeline not yet built.

## Problem
Admins need to populate the shared knowledge base with SOPs, policies, and product docs. The left file tree and center preview/tabs depend on real files existing. Upload is the entry point for the whole document workflow ([[Sage-MVP-Functional-Spec#4.6]]).

## Solution
Multi-file upload from global header **Upload** button and left-panel empty-state CTA. Client validates type/size; server re-validates authoritatively. Accepted files appear in the left panel file list.

**Interim (current):** `POST /api/files` Next.js route stores files on disk under `frontend/.data/uploads/` with a JSON manifest. Replaced by FastAPI `POST /files` when backend lands.

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

**Limits:** 25 MB per file ([[Sage-MVP-Functional-Spec#4.1]]). Max 50 files per batch (interim).

**Not accepted:** `.svg` (XSS risk), `.xlsx`, `.zip`, executables, system junk (`.DS_Store`, `Thumbs.db`, `desktop.ini` — skipped silently).

Constants live in `frontend/src/lib/file-upload.ts` (shared client + API route).

## Out of scope (this iteration)
- Folder upload (`webkitdirectory`) — enumerate + skip-summary deferred
- Admin role enforcement (no auth yet)
- Text extraction, auto-tags, manual-tag modal
- Replace / delete / kebab menu
- Center preview + tabs on upload
- Drag-and-drop onto center panel
- Per-business storage quotas (documented; not enforced in interim API)
- FastAPI + Supabase Storage

## UI/UX
- **Entry points:** global header Upload icon; left panel "Upload files" button when tree is empty.
- **Picker:** `<input type="file" multiple accept="...">` — OS grays unsupported types for file mode.
- **Feedback:** inline error banner for batch failures; skipped files listed in upload result.
- **After upload:** file list replaces empty state (flat list until folder tree exists).
- Admin-only in production; all users see upload UI in shell prototype until auth ships.

## Technical approach

### Client (`frontend/src/lib/file-upload.ts`)
- `ALLOWED_EXTENSIONS`, `ACCEPT_ATTRIBUTE`, `MAX_FILE_SIZE_BYTES`
- `validateFileForUpload(file)` → `{ ok } | { ok: false, reason }`
- `isSystemJunkFile(name)` for silent skip

### Interim API (`frontend/src/app/api/files/route.ts`)
- `GET` — list manifest entries
- `POST` — `multipart/form-data`, field `files` (repeatable)
- Storage: `frontend/.data/uploads/{uuid}.{ext}` + `manifest.json`
- Server: extension + size + magic-byte sniff; UUID storage path; sanitized display name only
- Returns `{ uploaded: SageFile[], skipped: { name, reason }[] }`

### Migration to FastAPI
Replace `files-api.ts` base URL with FastAPI; keep same client validation + shared types. Add JWT + Admin role check on server.

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
- `frontend/src/lib/file-upload.ts`, `frontend/src/app/api/files/route.ts`
- [[API-Documentation#Files]]
