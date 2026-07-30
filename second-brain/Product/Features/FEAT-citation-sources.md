---
type: feature
status: in-progress
tags: [area/frontend, area/backend, area/product]
created: 2026-07-28
updated: 2026-07-28
related: ["[[FEAT-preview-tabs]]", "[[Current-Context]]", "[[UI-UX-Guidelines]]"]
---

# FEAT: Clickable citation sources

## Status
`in-progress` — API + Sources badge UI + open-tab/highlight infra shipped. Real jump/highlight awaits Phase 9 file viewers ([[FEAT-preview-tabs]]).

## Problem
`/ask` answers appended opaque citation ids (`file_id#hash`) as plain text ("Sources: …"). Staff cannot tell which document was used, and cannot open the source from the chat.

## Solution
1. **`/ask` returns structured citations** — `{ id, file_id, filename, chunk_index, char_start, char_end }` (filename looked up from the tenant's `files` row). Same shape is persisted on `chat_history`.
2. **Sources badges in chat** — Gurubase-style row under the answer: muted "Sources" label + rounded buttons with file-type icon + filename. One badge per `file_id` (first cited chunk wins jump offsets).
3. **Click → open preview tab** — `openTab` with `resourceKey = file_id`, title = filename, and `viewState.highlight = { citationId, charStart, charEnd }` so Phase 9 viewers can scroll/highlight without another API change.

## Out of scope (this pass)
- Actual scroll/highlight inside the preview stage (no viewers yet — Phase 9).
- PDF page mapping from char offsets.
- Showing multiple badges for multiple chunks of the same file.

## UI/UX
Visual reference: Sources label + compact icon+filename pill (user mock, Gurubase-like). Clickable; opens/focuses the center preview tab.

## Technical approach
- Backend: `Citation` dataclass in [`backend/app/agent/answer.py`](backend/app/agent/answer.py); `CitationResponse` on [`backend/app/main.py`](backend/app/main.py) `/ask`.
- Frontend: [`frontend/src/components/ask/citation-sources.tsx`](frontend/src/components/ask/citation-sources.tsx); `AskCitation` in [`frontend/src/lib/ask/api.ts`](frontend/src/lib/ask/api.ts); `ViewState.highlight` / `OpenTabInput.viewState` in [`frontend/src/lib/preview-tabs/types.ts`](frontend/src/lib/preview-tabs/types.ts).

## Open questions
- None for MVP badge/open-tab path.

## Related
- [[FEAT-preview-tabs]] Phase 9 will consume `viewState.highlight`.
