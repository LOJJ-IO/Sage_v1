---
type: feature
status: in-progress
tags: [area/frontend, priority/high]
created: 2026-10-04
updated: 2026-10-04
related: ["[[Current-Context]]", "[[0007-boutique-retail-mvp-beachhead]]", "[[FEAT-citation-sources]]", "[[FEAT-preview-tabs]]"]
---

# FEAT: `/demo` — the real app, pre-populated, no login

## Status
`in-progress` — built 2026-10-04, uncommitted, not deployed. Not click-tested in a browser (no browser automation here).

## Problem
Sharing the link should show Sage looking alive. `/` needs a backend + sign-in; the production backend is currently down (`sagev1-production` → Railway "Application not found").

## Solution
`/demo` renders the same page component as `/`. On that route the API layer swaps in an in-browser mock backend seeded with a fictional boutique ("Juniper Lane Boutique"): 6 store docs (one finishes "processing" ~4s after load), 4 accounts, and a chat already in progress with Sources badges. Asking questions keyword-matches canned answers whose citations are real char offsets into the seeded docs; no match → the grounded refusal. Uploads/delete/replace work in memory; reload resets.

**Root redirect (2026-10-04):** `frontend/next.config.ts` temporarily redirects `/` → `/demo` (307) so the shared link opens the demo. Remove that `redirects()` entry to restore `/` as the real app — note `/sign-in` success pushes to `/`, so real logins also land in the demo while it's on.

**File list:** a 401 while loading files now shows an empty library instead of the "You must be signed in" banner (`hooks/use-file-library.ts`).

**Theme:** `/demo` defaults to light until the visitor picks a theme (`lib/theme.ts` + the inline script in `app/layout.tsx`).

**Header buttons wired (2026-10-04, applies to `/` too):** Files (reset filters), Search (filename/tag filter), Bookmarks (bookmarked-only toggle), Sort (cycles upload order → A–Z → Z–A), Auto-Sort (group by type), Auto-reveal (highlight + scroll active tab's file), History / Search chats (`components/ask/chat-history-popover.tsx`; New chat archives the current chat; `/demo` seeds 3 past chats), Voice input (Web Speech API, `hooks/use-voice-input.ts`). **New folder** / **Collapse all** now drive real folders (below). File view state: `hooks/use-file-view.ts`. Verified by driving headless Chrome over CDP (every button clicked, result asserted).

**Real documents (2026-10-04):** the seed is 3 `.md` (kept as-is per user) + 2 styled PDFs + 2 Word files, built by `frontend/scripts/demo-docs/build_demo_docs.py` into `public/demo/` (PDF via headless Chrome print, DOCX via python-docx). The same script writes `src/lib/demo/documents.generated.ts` (plain text) so citation offsets match the files — edit the script, never the outputs. Mock `/files/{id}/content` serves the real asset.

**Word viewer:** `.docx` previews now render the actual document with `docx-preview` (Apache-2.0), scaled to the panel width (`components/preview-tabs/viewers/docx-viewer.tsx`), falling back to `/text` if rendering fails or the download is refused (backend `/content` is admin-only). Applies to `/` too — replaces the extracted-text-only docx view.

**Folders:** `hooks/use-file-folders.ts` + `components/files/file-tree.tsx`. Collapsible folders, New folder (inline rename; double-click or pencil to rename), delete (files move to top level), drag a file onto a folder or right-click → Move to / Remove from folder, Collapse all, Auto-reveal opens the active file's folder, search/bookmark filters hide empty folders. Client-side only: **localStorage on `/`** (per browser — not synced, backend has no folder field), seeded and non-persistent on `/demo` (Policies / Operations / Training).

## Out of scope
- Real retrieval/LLM in the demo. Persisting demo state. Changing `/` or the sign-in flow.

## Technical approach
- `frontend/src/lib/demo/mode.ts` — `isDemoRoute()` (pathname). `lib/api/client.ts` `apiFetch` and `lib/files/api.ts` `downloadBackendFile` route to `lib/demo/mock-api.ts` (dynamic import — demo data stays out of the `/` bundle). `lib/accounts/api.ts` uses its in-memory path + `DEMO_ACCOUNTS_SEED`.
- Content: `lib/demo/seed.ts`. Every canned quote must appear verbatim in its doc — enforced by `lib/demo/mock-api.test.ts`.
- Backend/tenant invariants untouched: the demo never calls FastAPI.

## Open questions
- Link `/demo` from anywhere (sign-in page, landing)?
