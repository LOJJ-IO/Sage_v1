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

**Header buttons wired (2026-10-04, applies to `/` too):** Files (reset filters), Search (filename/tag filter), Bookmarks (bookmarked-only toggle), Sort (cycles upload order → A–Z → Z–A), Auto-Sort (group by type), Auto-reveal (highlight + scroll active tab's file), History / Search chats (`components/ask/chat-history-popover.tsx`; New chat archives the current chat; `/demo` seeds 3 past chats), Voice input (Web Speech API, `hooks/use-voice-input.ts`). **New folder** and **Collapse all** only show an explanatory toast — there is no folder model yet. File view state: `hooks/use-file-view.ts`. Verified by driving headless Chrome over CDP (every button clicked, result asserted).

## Out of scope
- Real retrieval/LLM in the demo. Persisting demo state. Changing `/` or the sign-in flow.

## Technical approach
- `frontend/src/lib/demo/mode.ts` — `isDemoRoute()` (pathname). `lib/api/client.ts` `apiFetch` and `lib/files/api.ts` `downloadBackendFile` route to `lib/demo/mock-api.ts` (dynamic import — demo data stays out of the `/` bundle). `lib/accounts/api.ts` uses its in-memory path + `DEMO_ACCOUNTS_SEED`.
- Content: `lib/demo/seed.ts`. Every canned quote must appear verbatim in its doc — enforced by `lib/demo/mock-api.test.ts`.
- Backend/tenant invariants untouched: the demo never calls FastAPI.

## Open questions
- Link `/demo` from anywhere (sign-in page, landing)?
