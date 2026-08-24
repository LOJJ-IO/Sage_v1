---
type: feature
status: shipped
tags: [area/frontend, area/backend, area/product]
created: 2026-08-23
updated: 2026-08-23
related: ["[[Sage-MVP-Functional-Spec#4.4 Personal file organization]]", "[[Sage-MVP-Functional-Spec#9 Database Schema]]", "[[FEAT-file-upload]]", "[[Current-Context]]", "[[Known-Issues]]"]
---

# FEAT: Personal folders (file-tree hierarchy)

## Status
`shipped` — backend + frontend both live in the working tree (not yet committed/deployed as of 2026-08-23). Closes the "New folder"/"Collapse all" no-ops flagged in [[Current-Context]].

## Problem
The Files panel's "New folder" and "Collapse all" toolbar buttons had existed as inert no-ops — no folder/tree data model backed them. `Sage-MVP-Functional-Spec.md` §4.4 already specced this: any user (not just admins) should be able to organize their own view of the shared file list into folders, purely visually.

## Solution
Implements **only** the personal (per-user) half of the spec's two-folder-system design:

- A **shared, admin-managed** folder structure (`files.folder_id`, admin-only `/folders` API per spec §9–10) — **not built**, not part of this feature.
- A **personal, per-user** folder arrangement — **built**. Purely a client-visual overlay: creating/renaming/moving/deleting a personal folder has zero effect on `app.retrieval` or on what any other user sees. Available to every signed-in user (`CurrentUser`, not `AdminUser`), matching spec §4.2.7.

Also explicitly **not built** (separate, deferred features): the "Auto-Sort"/Wand auto-grouping button (§4.5 — filename-similarity clustering, stays a no-op), the "Manager sort" toggle (needs the unbuilt shared system), `user_preferences` (theme/layout persistence, §6 — unrelated).

## Backend
- `backend/app/models.py`: `UserPersonalFolder` (self-referencing `parent_folder_id`, `ON DELETE CASCADE`) and `UserPersonalFolderItem` (a file's placement — `file_id` is a bare string, not an FK, matching `Chunk.file_id`'s existing convention since `File.file_id` isn't the table's UUID PK). Both carry `business_id` as a required, indexed column per `CLAUDE.md` §2.4, mirroring `ChatSettings`.
- `backend/app/personal_folders/` — service module (`list_tree`, `create_folder`, `rename_folder`, `move_folder`, `delete_folder`, `upsert_item_placement`, `remove_file_from_all_placements`) + `routes.py` mounted at `/me/folders`.
- `backend/app/files/service.py::delete_file_and_storage` now also calls `remove_file_from_all_placements` — deleting a file clears every user's placement of it (spec §4.7).
- Migration `1e955fc30f05_add_personal_folders` (down_revision `5db799a56660`), verified upgrade/downgrade/upgrade round-trips cleanly against the local dev DB.
- `backend/tests/app/test_personal_folders.py` — 29 tests: pure cycle-detection/renumbering helpers, service-level CRUD + cascade-delete + cross-user/cross-business isolation, route-level tests. Full backend suite (92 tests) passes.

### Design decisions
- **Folder delete cascades to nested folders only, never files.** DB `ON DELETE CASCADE` removes the folder + subfolders + their placement rows in one statement; files just become unplaced (root). Verified live: deleting a folder with a nested subfolder and a nested file inside that subfolder removes both folders and leaves the file fully intact at root.
- **`position` is a plain integer**, renumbered contiguously per sibling group on every write.
- **Unplaced files need no DB row** — write-on-first-touch only; sort alphabetically after explicitly-positioned siblings.
- **Cycle prevention** enforced server-side (422) and mirrored client-side (same algorithm, different language) to grey out invalid drop targets before a request fires.

## Frontend
- `frontend/src/lib/personal-folders/` — `types.ts`, `tree.ts` (pure: `buildFolderTree`, `getFolderChildFileIds`, `getRootFileIds`, `wouldCreateCycle`, `getDescendantFolderIds`, `getAncestorFolderIds(ForFile)`), `tree.test.ts` (18 tests), `api.ts`. Mirrors the `frontend/src/lib/preview-tabs/` module shape.
- `frontend/src/hooks/use-personal-folders.ts` — fetches the tree, exposes CRUD + expand/collapse state. Refetches the full tree after every mutation rather than hand-patching local state (small payload, avoids client/server drift).
- `frontend/src/components/files/file-list.tsx` — refactored to export a shared `FileRow` component so the tree and the flat list render files identically.
- `frontend/src/components/files/personal-folder-tree.tsx`, `folder-row-menu.tsx`, `delete-personal-folder-dialog.tsx` — hand-rolled recursive tree (no new npm dependency — no `@radix-ui/*`/`dnd-kit` existed in this repo already; used `framer-motion` (already a dependency) for expand/collapse animation and native HTML5 drag-and-drop). Matches the existing VS Code–explorer aesthetic (codicons, `group-hover` kebab reveal) per [[Workspace-UI-Design-Decisions]] rather than pulling in a magicui/shadcn tree sample (those assume Radix Collapsible, not present here).
- `frontend/src/components/files/file-library-panel.tsx`, `frontend/src/app/page.tsx` — tree renders by default; falls back to the existing flat, sorted `FileList` while a file search or bookmarks-only filter is active (**the tree is not search-aware in v1** — a disclosed scope cut, not an oversight). "New folder" always creates at root and enters inline-rename immediately; nesting happens only via drag afterward. "Auto-reveal current file" now also expands a revealed file's ancestor folders.
- Frontend test suite: 95 passing (18 new). `tsc --noEmit` clean. `next build` succeeds. `npm run lint`: 2 new instances of the repo's pre-existing, already-deferred `react-hooks/set-state-in-effect` finding (10 → 12 total) — same established pattern as `use-file-library.ts`'s `refreshFromBackend` effect; not a new category of issue. See [[Known-Issues]].

### Drag-and-drop scope cut (disclosed)
Dropping a file/folder onto a folder row moves it into that folder, **appended at the end** of the destination list — there is no fine-grained "insert between these two specific siblings" via drag in v1. The backend's `position` is an arbitrary integer, so finer ordering can be added later without a schema/API redesign; this was cut for time, not because it's hard to add.

### A real bug caught by live browser testing (not by the automated suites)
Every automated check (pytest, vitest, tsc, build) passed while the actual drag-and-drop was **silently doing nothing** — dragging a file onto a folder had zero effect, with no console error. Root cause: `onDragOver`/`onDrop` handlers read a `useState`-held "currently dragged item" value, but native HTML5 drag events (`dragstart` → `dragover` → `drop`) can fire faster than React re-renders, so the drop handler's closure still saw the pre-`dragstart` `null` value and `event.preventDefault()` never ran, so the browser refused the drop outright. Fixed by tracking the dragged item in a `useRef` (updated synchronously, read by the drop-target handlers) instead of relying on state for the correctness-critical read; state is kept only for the (non-critical) visual drag-over highlight. Verified with a scripted Playwright pass: create → rename → drag a file into a folder → drag that folder into another folder → reload (nesting/placement persists, expand state resets as designed) → collapse all → right-click delete with nested contents (files survive, reappear at root; nested folders are gone) — all confirmed via real DOM state and screenshots, zero console errors. See [[Lessons-Learned]] for the generalized lesson.

## Post-ship fixes (2026-08-23, same-day user feedback after production deploy)

Real usage against the deployed feature surfaced four real bugs, fixed same day (not yet redeployed as of this writing):

- **Create/rename/drag felt slow with no feedback.** Root cause: every mutation in `use-personal-folders.ts` called its API, then `await refresh()` — a full second `GET /me/folders` round trip before the UI updated at all. Fixed: every mutation now applies the change to local state directly from its own response (optimistic + patch-based rollback on error for delete/move, which don't need to wait on a server-assigned id). Cut round trips per action from 2 to 1; measured locally: create→rename-input ~300ms, rename-commit ~45ms, drag-settle ~300ms (previously "well over a second" / "about 2 whole seconds" per user report).
- **"Auto-reveal current file" lost the highlight when the target file's folder was collapsed.** The reveal effect only depended on `revealFileId`, so when a folder needed to expand first, the newly-mounted file row's ref wasn't captured — folder opened, no highlight ever ran. Fixed by expanding ancestors and setting the reveal target in the same event handler (React batches them into one render, so the row exists by the time the effect runs). Also redesigned per user directive: **this is a one-shot locate-and-flash action now, not a persistent toggle/mode** — no more `active` ring on the button; a click expands what's needed and highlights for 3s (was 1.5s, and was continuously re-triggering on every tab switch while "on"). Renamed label "Auto-reveal current file" → "Reveal current file" to match.
- **Sort toggle had zero effect in tree view.** `sortOrder` was applied to the flat/filtered fallback list but was never threaded into `PersonalFolderTree` at all. Fixed: `getRootFileIds` takes a `direction` param now, applied only to the alphabetical fallback for *unplaced* root files — drag-positioned files/folders keep their explicit order regardless of the toggle, by design.
- **"Files" toolbar button did nothing.** Now resets to the default tree view (clears search query + closes the search box + clears the bookmarks-only filter).

Also implemented same day: **Collapse all ⇄ Expand all is now a real bidirectional toggle** (`codicon-collapse-all` / `codicon-expand-all`, swapping based on whether any folder is currently expanded) — was previously collapse-only with no expand-all affordance. New `expandAll()` in the hook.

All verified live via a scripted Playwright pass against the local dev backend (not production) — see `tree.test.ts` for the pure-logic coverage of the sort-direction change; the optimistic-update rollback paths and the reveal-timing fix aren't unit-tested (they're timing/DOM-ordering-dependent), only browser-verified.

## Out of scope
- Admin shared folder structure (`files.folder_id`, `/folders` API).
- Auto-Sort/Wand auto-grouping.
- "Manager sort" personal-vs-shared toggle.
- `user_preferences` (theme/layout persistence) — expand/collapse state resets on reload by design.
- Search/bookmark-aware tree (falls back to flat list instead).
- Fine-grained drag-to-reorder-between-siblings (append-at-end only).

## Known caveat
`GET /files` (and every `/files` route) is still gated behind `AdminUser`, not `CurrentUser`, even though this feature and the spec both intend browsing for every staff member. Personal folders work correctly once that's fixed; logged separately in [[Known-Issues]] since it predates and is unrelated to this feature.

## Related
- [[Sage-MVP-Functional-Spec#4.4 Personal file organization]], [[Sage-MVP-Functional-Spec#9 Database Schema]], [[Sage-MVP-Functional-Spec#10 API Surface]]
- `backend/app/personal_folders/`, `frontend/src/lib/personal-folders/`, `frontend/src/components/files/personal-folder-tree.tsx`
