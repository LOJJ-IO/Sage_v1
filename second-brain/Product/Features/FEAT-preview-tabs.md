---
type: feature
status: in-progress
tags: [area/frontend, area/design]
created: 2026-07-28
updated: 2026-07-28
related: ["[[FEAT-app-shell-layout]]", "[[Current-Context]]", "[[Lessons-Learned]]"]
---
<!-- Filename convention: Product/Features/FEAT-short-title.md -->

# FEAT: Middle-pane file preview tabs

## Status
`in-progress` — pure state layer (types/reducer/selectors/storage/store + full test suite) shipped; tab-strip UI, viewers, and wiring into `page.tsx`/`use-file-library.ts` not started.

## Problem
The middle pane of the app shell ([frontend/src/app/page.tsx](frontend/src/app/page.tsx)) is an empty `<section>` — there's no way to preview an opened file. The subsystem needed to support this (tabs, pinning, duplication, removed-file handling, overflow) is meaningfully stateful and was scoped out as its own design pass rather than bolted onto UI code, to avoid re-deriving pinning/duplication/removal rules ad hoc mid-implementation.

## Solution
A workspace tab system, modeled explicitly as a state machine rather than "array of open files + selected index":

- **Two identity layers**: `resourceKey` (= `fileId` for MVP — no version/etag exists in `backend/app/models.py`'s `File`, so no version-awareness yet) identifies the underlying file; `tabId` identifies one open viewing *instance*. Two tabs can share a `resourceKey` (explicit duplication only) while owning independent `viewState` (zoom/page/scrollTop).
- **MRU tracking**: `mruTabIds` records most-recently-interacted-with order (focus, open, duplicate, *and* pin/unpin all promote to front). Opening an already-open file focuses the MRU match instead of duplicating.
- **Pinning is protective, not cosmetic**: pinned tabs sort first, can't be closed directly, and survive `closeAllUnpinned` — including when a pinned tab's lifecycle is `removed`.
- **Removed-file continuity**: a resource going away transitions all its open tabs to `lifecycle: "removed"` (with an optional message) instead of silently closing them, so the user can see what happened.
- **Overflow mode** (`pagination` vs `scroll`) is a strip-level preference persisted to `localStorage`, independent of tab membership.

Implementation lives at `frontend/src/lib/preview-tabs/`:
- `types.ts` — `PreviewTab`, `PreviewTabsState`, `TabLifecycle`, `ViewState`, `OpenTabInput`.
- `reducer.ts` — pure `previewTabsReducer(state, action, deps?)`, one action per verb (`OPEN_TAB`, `FOCUS_TAB`, `DUPLICATE_TAB`, `CLOSE_TAB`, `CLOSE_ALL_UNPINNED`, `PIN_TAB`/`UNPIN_TAB`, `MARK_RESOURCE_REMOVED`, `UPDATE_VIEW_STATE`, `SET_OVERFLOW_MODE`). Takes an injectable `makeTabId()` for deterministic tests.
- `selectors.ts` — `getOrderedTabs` (pinned-then-unpinned), `findMruMatchingTab`, `canCloseTab`/`canDuplicateTab`/`canUnpinTab`/`isRemovedTab`, etc.
- `storage.ts` — `loadOverflowMode`/`saveOverflowMode`, SSR-safe, invalid values fall back to `"scroll"`.
- `store.ts` — thin zustand wrapper (`usePreviewTabsStore`) around the reducer; only side effect is persisting `overflowMode`.
- 65 tests across `reducer.test.ts` (action-by-action + an invariants section), `selectors.test.ts`, `storage.test.ts`, `store.test.ts` — bootstrapped **vitest** for this, the first test runner in the repo (`frontend/vitest.config.ts`, `npm run test`).

Notable resolved judgment calls (not obvious from a first read of the rules):
- `OPEN_TAB` refreshes the focused tab's `title`/`fileType` from the input — a file replace (`PUT /files/{file_id}`) keeps `resourceKey` stable but can rename the file, so a focused tab must not show a stale name.
- `closeAllUnpinned` only reselects the active tab if it was itself unpinned (and thus just removed); an active *pinned* tab stays active even if its lifecycle is `removed`, since pinned tabs are never touched by this action.
- If only a `removed` tab exists for a `resourceKey`, `OPEN_TAB` opens a fresh tab rather than reviving the stale one (treated as "the file came back").

## Out of scope (this pass)
- Tab-strip UI, kebab menus, tooltips — no component wiring yet.
- Actual file viewers (PDF/docx/image rendering) — don't exist in the repo at all yet; this is its own build.
- Wiring `markResourceRemoved` to the real removal signal. Decision made but not implemented: diff `frontend/src/hooks/use-file-library.ts`'s existing 2s poll against open tabs' `resourceKey`s.
- Debounced `updateViewState` syncing from a real viewer (viewer responds immediately; store write is debounced) — needs a real viewer to attach to.
- Version-aware `resourceKey` — would need a backend version/etag field that doesn't exist today.

## UI/UX
Not designed yet. Pinned-tab compression floor (icon + truncated filename + pin affordance + kebab, full name via tooltip) and ownership boundaries (strip-level vs tab-level controls) are specified in the originating design brief but not yet reflected in any mockup or [[UI-UX-Guidelines]] entry.

## Technical approach
Reducer/selectors are framework-agnostic pure functions, independently tested without React or zustand. `store.ts` is the only place zustand appears — chosen because this session introduced it as the app's first non-`useState` state container (see [[Current-Context]]). No ADR needed yet; this isn't a cross-cutting architecture decision, just this one subsystem's internal state management choice.

## Open questions
- How should the UI trigger `markResourceRemoved` — a `useEffect` diffing `use-file-library`'s polled list against `usePreviewTabsStore`'s tabs, on every poll tick or only on transitions?
- Should duplicate/pin/close actions be reachable from more than the tab kebab (e.g. file-tree right-click) once UI wiring starts?

## Related
- [[FEAT-app-shell-layout]] — the app shell the middle pane belongs to; center panel placeholder should be updated once tabs land.
- [[Current-Context]] — resolves "translate the tab-previewer design into an implementation-ready plan" open item.
