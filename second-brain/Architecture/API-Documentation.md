---
type: architecture
status: active
tags: [area/backend]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Architecture-Overview]]", "[[Sage-MVP-Functional-Spec#10. API Surface (Draft Route Map)]]", "[[0004-username-pin-modular-auth]]"]
---

# API Documentation

Draft route map from [[Sage-MVP-Functional-Spec#10. API Surface (Draft Route Map)]]. All routes except sign-in require JWT. All routes auto-scoped to caller's `business_id`. "Admin" = role check in middleware.

## Conventions

| Topic | Choice |
|---|---|
| Auth scheme | JWT in `Authorization` header; 30-min inactivity expiry |
| Error shape | TBD at implementation |
| Multi-tenancy | Every query scoped by authenticated user's `business_id` |
| Internal routes | Shared service token; never public |

## Auth

### POST /auth/login
**Auth:** none  
**Request:** `{ username, pin }`  
**Response:** JWT, or `must_change_pin: true` for first-login / post-reset flow

### POST /auth/change-pin
**Auth:** required (or limited token during must-change flow)  
**Request:** `{ new_pin }`  
**Notes:** 4–6 digits; staff-chosen after first login

### POST /auth/logout
**Auth:** required

## Accounts (Admin)

### GET /accounts
List accounts (username, role, created_at).

### POST /accounts
Create account. If granting admin: require admin's PIN in payload ([[Sage-MVP-Functional-Spec#3.4.4]]).

### POST /accounts/{id}/reset-pin
Sets temporary PIN; forces change on next login.

### POST /accounts/{id}/deactivate
Blocked for primary admin.

### POST /accounts/{id}/reactivate

## Files

### GET /files
List files + shared folder structure.

### GET /files/{id}
Metadata.

### GET /files/{id}/download
Raw file proxied from storage.

### GET /files/{id}/preview
Preview payload (PDF stream / extracted text per file type).

### POST /files
Upload (Admin). Runs pipeline: validate → store → extract text → auto-tag. Returns suggested tags.

### PUT /files/{id}/replace
Replace file, keep id/tags/bookmarks/placements (Admin).

### PUT /files/{id}/tags
Edit tags (Admin).

### DELETE /files/{id}
Delete + cascades (Admin).

### GET /files/search?q=
Filename search only (MVP).

## Shared folders (Admin)

### POST /folders
### PUT /folders/{id}
### DELETE /folders/{id}

## Personal workspace

### GET /me/preferences
### PUT /me/preferences
Theme + layout JSON (debounced batch-save).

### GET /me/folders
### POST /me/folders
### PUT /me/folders/{id}
### DELETE /me/folders/{id}
Personal folders + arrangement (positions).

### POST /me/autogroup
Run wand against caller's personal arrangement.

### GET /me/bookmarks
### POST /me/bookmarks
### DELETE /me/bookmarks/{id}

## Sage

### POST /sage/query
**Request:** `{ question, conversation_id?, suggested_file_ids? }`  
**Response:** `{ searched_for, matched_files, answer, citations }` (Ferndesk-style transparency)  
**Notes:** Auth + daily cap (default 100/user/day) → delegate to `sage-agent` → write `chat_history` / `fallback_events`

### GET /sage/history
List past conversations (most recent first).

### GET /sage/history/{id}
One conversation.

## Internal (service-to-service only)

### POST /internal/retrieve
**Auth:** shared service token (VoltAgent only)  
**Request:** `{ question, business_id, suggested_file_ids? }`  
**Response:** Matched files' `extracted_text` + citation indices  
**Notes:** Keyword/tag matching ([[0006-keyword-retrieval-mvp]]); upgrade to vector internally later.

## Deployment note

Three Railway services: frontend, FastAPI, sage-agent. Frontend↔backend: single domain path routing or CORS. sage-agent: private networking only.
