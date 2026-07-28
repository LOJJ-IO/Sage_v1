---
type: feature
status: in-progress
tags: [area/frontend, area/design]
created: 2026-07-28
updated: 2026-07-28
related: ["[[FEAT-app-shell-layout]]", "[[Current-Context]]", "[[Lessons-Learned]]", "[[UI-UX-Guidelines]]", "[[Workspace-UI-Design-Decisions]]"]
---
<!-- Filename convention: Product/Features/FEAT-short-title.md -->

# FEAT: Middle-pane file preview tabs

## Status
`in-progress` — **Phases 1–8 complete** (pure state + tab-strip UI + removal-poll sync, 69 tests + vitest). Phase 9 (real viewers) and Phase 10 (CI gate) not started.

## Phases (master roadmap)

| Phase | Name | Status | Deliverable |
|---|---|---|---|
| **1** | **Types & identity model** | ✅ Done | `types.ts` — `ResourceKey`, `TabId`, `PreviewTab`, `PreviewTabsState`, `OpenTabInput`, `ViewState`, `TabLifecycle`, `OverflowMode`. Reuses `SageFileType` from `file-upload.ts`. |
| **2** | **Pure reducer / state machine** | ✅ Done | `reducer.ts` — all 10 actions; injectable `makeTabId()`; no React/zustand imports. |
| **3** | **Selectors** | ✅ Done | `selectors.ts` — ordering, MRU lookup, capability guards (`canCloseTab`, etc.). |
| **4** | **Persistence boundary** | ✅ Done | `storage.ts` — SSR-safe `loadOverflowMode` / `saveOverflowMode`; only overflow mode persists in MVP. |
| **5** | **Store wrapper** | ✅ Done | `store.ts` — `usePreviewTabsStore` (first zustand in repo); reducer remains source of truth. |
| **6** | **Test harness** | ✅ Done | vitest bootstrap + 65 tests (`reducer`, `selectors`, `storage`, `store`); `npm run test`. |
| **7** | **Tab-strip UI + stage shell** | ✅ Done | `frontend/src/components/preview-tabs/` (10 files: strip, lanes, tab, both kebab menus, compression hook, file-type icon, stage, center panel, barrel); wired into `page.tsx`'s center panel and `FileList` row click → `openTab`. No real viewers (by design — Phase 9). |

### Post–Phase 7 (not numbered in the 7-phase core plan)

| Follow-up | Status | Scope |
| --- | --- | --- |
| **8 — Lifecycle sync** | ✅ Done | `markResourceRemoved` wired by diffing `useFileLibrary().files` against open tab `resourceKey`s; title/fileType refresh on poll when file still exists (already handled by `OPEN_TAB`). |
| **9 — File viewers** | 🔲 Next | PDF / image / text-markdown / docx-text preview renderers; debounced `updateViewState`; download via `downloadBackendFile`; consume `viewState.highlight` from [[FEAT-citation-sources]] (scroll + highlight char range for text; PDF mapping later). |
| **10 — CI gate** | 🔲 Blocked | GitHub Actions: `lint`, `test`, `tsc`, `build` on frontend PRs; required check before merge/deploy. Blocked on repo-wide `react-hooks` lint sweep. |

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

### Phase 8 — Lifecycle sync (implemented)

- New pure selector `getResourceKeysToMarkRemoved(tabs, presentResourceKeys)` in `frontend/src/lib/preview-tabs/selectors.ts` — returns the deduped `resourceKey`s of non-removed tabs absent from a "currently present" set. Framework-agnostic, unit-tested (4 cases) without touching the reducer.
- New hook `frontend/src/hooks/use-sync-removed-preview-tabs.ts` (`useSyncRemovedPreviewTabs(files)`) — a `useEffect` keyed on `[files, tabs, markResourceRemoved]` that diffs `useFileLibrary().files` (the existing 2s poll's output) against `usePreviewTabsStore`'s open tabs each time either changes, and calls `markResourceRemoved` for anything missing. Covers both explicit delete (`removeFile` mutates `files` synchronously, no poll wait) and external disappearance (poll refresh).
- Wired into `frontend/src/app/page.tsx`: `useSyncRemovedPreviewTabs(files)` right after `useFileLibrary()`.
- Title/fileType refresh on file replace was already covered by `OPEN_TAB`'s refresh-on-focus behavior (see resolved judgment calls above) — nothing further needed for that half of Phase 8.
- No race on mount: tabs only exist once a user has opened one, by which point `files` has already loaded — so there's no window where an empty initial `files` list would spuriously mark a tab removed.

## Out of scope (Phase 1–8, done)

- Actual file viewers (PDF/docx/image rendering) — don't exist in the repo at all yet; Phase 9. Stage shows a placeholder/empty/removed state only.
- Debounced `updateViewState` syncing from a real viewer (viewer responds immediately; store write is debounced) — needs a real viewer to attach to. Phase 9.
- Version-aware `resourceKey` — would need a backend version/etag field that doesn't exist today.
- `closeAllUnpinned()` has no UI entry point yet (spec marks it optional for Phase 7); reducer/tests already cover it.
- Drag-reorder tabs, session restore of open tabs — explicitly excluded by the Phase 7 brief.

## Known caveats from Phase 7

- **`overflowMode` SSR hydration:** `store.ts` calls `loadOverflowMode()` synchronously at module-eval time, which reads real `localStorage` client-side but the default (`"scroll"`) server-side. If a user persisted `"pagination"`, the first client render can mismatch the server-rendered HTML for one tick before React corrects it (a dev-mode hydration warning, not a functional bug — `toast-provider.tsx` sidesteps the same class of issue with a `mounted` guard, which this doesn't yet do). Worth a `mounted` guard if the warning proves noisy in practice.
- **Repo-wide `npm run lint` is not clean**, independent of this work — `eslint-config-next` 16.2.9 bundles a stricter `eslint-plugin-react-hooks` that flags `react-hooks/set-state-in-effect` and `react-hooks/static-components` across several pre-existing files (`file-row-menu.tsx`, `file-type-icon.tsx`, `edit-file-tags-dialog.tsx`, `toast-provider.tsx`, `theme-provider.tsx`, `use-file-library.ts`, `use-dialog-draft.ts`, `account-row-menu.tsx`, `organization-view.tsx`, and `page.tsx`'s `getUserRole` effect). None of this was introduced by Phase 7 — all new `preview-tabs/` files are lint-clean — but a repo-wide sweep is needed before Phase 10's CI gate can require `eslint` to pass.

## UI/UX
Visual reference: Chrome/Obsidian-style tab strip — active tab visually connected to preview stage; inactive tabs recede; crowded mode compresses gracefully. Full rules in [[UI-UX-Guidelines#Preview tab strip]] and [[Workspace-UI-Design-Decisions#2. Tab model (center panel / file previewer)]].

Key visual laws:
- **Active vs inactive:** active tab has higher contrast and feels attached to the preview surface; inactive tabs are flatter/quieter. Active ≠ focus ring — active is persistent selection; focus is transient keyboard state.
- **Width under pressure:** active tab stays wider than neighbors; inactive tabs compress more aggressively. Pinned cluster compresses *before* unpinned region loses readability.
- **Pinned cluster:** fixed left group, non-scrollable by default; divider after last pinned tab when `pinnedCount > 0` (no divider, no reserved gap when zero pinned). Kebab remains on pinned tabs (unpin, duplicate; close disabled while pinned). Unpin promotes MRU (already in reducer).
- **Progressive compression (pinned):** (0) icon + truncated label → (1) stronger truncation → (2) icon-only + tooltip for full filename + kebab → (3) fallback only: pinned region becomes independently horizontally scrollable; active pinned tab auto-reveals inside that region.
- **Unpinned region:** owns normal overflow (`pagination` | `scroll` from store); active tab always brought into view.

## Phase 7 — Tab-strip UI implementation brief (no viewers)
**Goal:** Render and interact with `usePreviewTabsStore` in the empty center `<section>` at `frontend/src/app/page.tsx` (~line 565). No PDF/docx/image viewers yet — preview **stage** is a placeholder empty/error/removed state only.

### Do not reimplement state rules in components
All behavior comes from `frontend/src/lib/preview-tabs/`:
- `usePreviewTabsStore` for actions
- selectors: `getOrderedTabs`, `getPinnedTabs`, `getUnpinnedTabs`, `canCloseTab`, `canDuplicateTab`, `canUnpinTab`, `isRemovedTab`, `getActiveTab`
- `FileTypeIcon` / `fileTypeFromFilename` from existing file components where useful

### Component boundaries
```
frontend/src/components/preview-tabs/
  preview-tab-strip.tsx       # strip shell: pinned lane + divider + unpinned lane + strip settings
  preview-tab.tsx             # single tab button (active/inactive/removed visual states)
  preview-tab-menu.tsx        # per-tab kebab: pin/unpin, duplicate, close (disabled rules)
  tab-strip-settings-menu.tsx # strip kebab: overflow mode (pagination | scroll)
  preview-stage.tsx           # body below strip: placeholder | removed error empty-state
```

### Strip layout (two regions)
Render as **two logical regions**, not one homogeneous scrolling row:

```txt
[ pinned lane (fixed, compresses first) ][ divider? ][ unpinned lane (overflow-managed) ][ strip settings ]
```

- **Divider:** render only when `getPinnedTabs(state).length > 0`. No placeholder spacing when no pins.
- **Pinned lane:** default non-scrollable fixed left cluster. Under viewport pressure: compress → icon-only → **last resort** independent horizontal scroll. When scrollable, `scrollIntoView` / equivalent when a pinned tab becomes active.
- **Unpinned lane:** `overflowMode` from store (`pagination` with prev/next **or** `overflow-x-auto` free scroll). Always auto-reveal active tab in this region too.

### Tab visual states (`preview-tab.tsx`)
| State | Treatment |
|---|---|
| Active | Elevated/connected to stage below (rounded top, `bg-background`, matches panel surface); **wider min-width** than inactive neighbors |
| Inactive | Lower contrast, flatter |
| Pinned inactive | Same as inactive + pin indicator; may be icon-only under compression |
| Removed | Same shell shape; error/empty-state styling; duplicate disabled; stage shows "could not preview" / removed message |

Minimum visible content by compression stage:
- Normal: file-type icon + truncated title + kebab
- Pinned compressed: icon-only acceptable; full title via **tooltip** (touch: long-press or focus equivalent later)
- Kebab always reachable on pinned tabs even when icon-only

### Actions wiring
| User gesture | Store call |
|---|---|
| Click file in tree (later) | `openTab({ resourceKey, title, fileType })` |
| Click tab | `focusTab(tabId)` |
| Kebab → Duplicate | `duplicateTab(tabId)` if `canDuplicateTab` |
| Kebab → Pin / Unpin | `pinTab` / `unpinTab` |
| Kebab → Close | `closeTab(tabId)` if `canCloseTab` |
| Strip settings → overflow | `setOverflowMode("pagination" \| "scroll")` |

File-tree wiring can be stubbed in Phase 7 with a minimal "open first file" dev path or left unwired if strip is testable via Storybook/manual store calls — prefer at least one integration path from `FileList` row click → `openTab`.

### Preview stage (`preview-stage.tsx`)
- No real viewer. Show:
  - **Empty:** no tabs — center zero-state (link to upload / file tree)
  - **Ready:** placeholder ("Preview coming soon") + filename
  - **Removed:** app empty-state pattern with destructive icon + "File could not be preview" / removed message from `errorMessage`
- Stage visually connects to active tab (shared top edge / no gap — Chrome inspo)

### Accessibility
- Tab strip: `role="tablist"`; each tab `role="tab"` + `aria-selected`
- Disabled kebab items: `aria-disabled` + no-op handler
- Tooltips: use existing portaled `Tooltip` pattern ([[UI-UX-Guidelines#Tooltips]])

### Testing (Phase 7)
- Prefer component tests only if cheap; **minimum:** manual checklist + keep existing 65 reducer tests green
- Optional: `@testing-library/react` + jsdom for strip render smoke tests (not required if time-boxed)

### Explicitly out of scope for Phase 7
- PDF/docx/image viewers
- `markResourceRemoved` wiring to `use-file-library` poll (Phase 8)
- Debounced `updateViewState` from a real viewer (Phase 8+)
- Drag-reorder tabs
- Session restore of open tabs

### Acceptance criteria
1. Center panel shows tab strip + stage placeholder when tabs exist
2. Can open/focus/duplicate/close/pin/unpin via UI; behavior matches reducer tests
3. Active tab visually dominant and wider; Chrome-like attachment to stage
4. Pinned/unpinned regions + conditional divider behave per compression stages
5. Strip overflow mode toggle persists via existing `storage.ts`
6. Removed-tab lifecycle renders error empty-state (can be triggered manually via store in dev)
7. `npm run test`, `tsc --noEmit`, `eslint` still clean

---

## Claude implementation plan — Phase 7 (detailed)

**Status: implemented 2026-07-28.** Kept below as the historical brief/reference — don't re-derive these rules from scratch for Phase 8/9 follow-ups, extend this doc instead. See [[Current-Context]] for what shipped and the known caveats above.

**Read this entire section before writing any UI code.** The state layer is done and tested — your job is presentation + wiring, not re-deriving tab rules.

### 0. First principles (do not violate)

1. **Tab ≠ file.** A tab is a viewing *instance* (`tabId`). Multiple tabs may share `resourceKey` (explicit duplicate only).
2. **Reducer owns truth.** Components call store actions and read via selectors. Never implement close/pin/MRU logic in JSX handlers.
3. **Two strip regions.** Pinned lane and unpinned lane are separate layout containers with different overflow behavior.
4. **Visual truth = state truth.** Active tab must be visible, wider, and connected to stage. Removed tabs stay visible with error styling — never silently vanish.
5. **Overflow mode is strip-level.** Lives in `tab-strip-settings-menu.tsx`, not per-tab kebab.
6. **Do not build viewers in Phase 7.** Stage shows placeholder / removed empty-state only.

### 1. Existing code to reuse (do not reinvent)

| Need | Use |
|---|---|
| Tab state | `usePreviewTabsStore` from `frontend/src/lib/preview-tabs/store.ts` |
| Guards | `canCloseTab`, `canDuplicateTab`, `canUnpinTab`, `isRemovedTab`, `getActiveTab`, `getPinnedTabs`, `getUnpinnedTabs` |
| Panel shell | `PANEL_SURFACE` pattern from `page.tsx`: `"flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-background"` |
| Empty states | `Empty`, `EmptyHeader`, `EmptyMedia`, `EmptyTitle`, `EmptyDescription` from `@/components/ui/empty` (see `FilesEmptyState` in `page.tsx`) |
| Tooltips | Portaled `Tooltip` / `TooltipTrigger` / `TooltipContent variant="compact"` from `@/components/ui/tooltip` |
| Kebab menus | Follow `FileRowMenu` pattern: portaled fixed menu, pointer-down dismiss, escape close (`frontend/src/components/files/file-row-menu.tsx`) |
| File type icons | Extract or duplicate icon logic from `FileTypeIcon` — it currently expects `LibraryFile`; for tabs pass `{ fileType, title }` via a thin `PreviewFileTypeIcon` wrapper |

### 2. Files to create

```
frontend/src/components/preview-tabs/
  preview-center-panel.tsx    # top-level: strip + stage; mounts in page.tsx
  preview-tab-strip.tsx       # two-region strip + settings slot
  preview-tab-lane.tsx        # reusable horizontal lane (pinned or unpinned)
  preview-tab.tsx             # single tab button
  preview-tab-menu.tsx        # per-tab kebab
  tab-strip-settings-menu.tsx # strip overflow mode
  preview-stage.tsx           # body below strip
  preview-file-type-icon.tsx  # icon from SageFileType + title (for image ext)
  use-tab-lane-compression.ts # optional hook: measure lane width → compression stage
  index.ts                    # barrel export
```

### 3. Integration point — `page.tsx`

Replace the empty center section (~line 565):

```tsx
// Before:
<section className={PANEL_SURFACE} />

// After:
<PreviewCenterPanel filesEmpty={files.length === 0} />
```

`PreviewCenterPanel` is a client component that:
- subscribes to `usePreviewTabsStore`
- renders strip + stage
- does **not** need file list passed in for Phase 7 if file-tree wiring happens via callback prop from parent

**Preferred wiring for file open:** add optional prop to `FileLibraryPanel` / `FileList`:

```tsx
onOpenFile?: (file: LibraryFile) => void
```

On row click (the existing filename `<button>` in `file-list.tsx`), call:

```tsx
onOpenFile?.(entry)
```

In `page.tsx`:

```tsx
const openTab = usePreviewTabsStore((s) => s.openTab);

const handleOpenFile = (entry: LibraryFile) => {
  openTab({
    resourceKey: entry.id,
    title: entry.file.name,
    fileType: entry.fileType,
  });
};
```

Pass `onOpenFile={handleOpenFile}` to `FileLibraryPanel`.

### 4. Component specs

#### 4.1 `preview-center-panel.tsx`

```tsx
type PreviewCenterPanelProps = {
  /** When true and no tabs open, show center zero-state pointing at file tree */
  filesEmpty?: boolean;
};
```

Layout:

```txt
<section className={PANEL_SURFACE}>
  <PreviewTabStrip />          // shrink-0, border-b border-border
  <PreviewStage filesEmpty />  // flex-1 min-h-0 overflow-hidden
</section>
```

Subscribe minimally — prefer selectors:

```tsx
const tabs = usePreviewTabsStore((s) => s.tabs);
const activeTab = usePreviewTabsStore((s) => getActiveTab(s));
```

Or pass state down from one subscription to avoid multiple re-renders.

#### 4.2 `preview-tab-strip.tsx`

Horizontal flex row, full width, `h-10` or `h-9`, `bg-muted` well behind tabs (Chrome: tabs sit on muted strip, active tab is `bg-background`).

Structure:

```txt
<div className="flex min-w-0 items-end border-b border-border bg-muted px-1 pt-1">
  <PreviewTabLane variant="pinned" tabs={pinnedTabs} />
  {pinnedTabs.length > 0 && <div className="mx-0.5 w-px self-stretch bg-border" />}
  <PreviewTabLane variant="unpinned" tabs={unpinnedTabs} flex-1 />
  <TabStripSettingsMenu />
</div>
```

**Divider:** render `{pinnedTabs.length > 0 && ...}` — no spacer when zero pins.

Get tabs from store + selectors:

```tsx
const state = usePreviewTabsStore(); // or shallow pick
const pinnedTabs = getPinnedTabs(state);
const unpinnedTabs = getUnpinnedTabs(state);
const activeTabId = state.activeTabId;
const overflowMode = state.overflowMode;
```

#### 4.3 `preview-tab-lane.tsx`

Props:

```tsx
type PreviewTabLaneProps = {
  variant: "pinned" | "unpinned";
  tabs: PreviewTab[];
  activeTabId: TabId | null;
  overflowMode?: OverflowMode; // unpinned only
};
```

**Pinned lane behavior:**
- Default: `flex shrink-0 overflow-hidden` (non-scrollable)
- Compression stages (see §5): normal → truncated → icon-only → `overflow-x-auto` fallback
- `useEffect`: when `activeTabId` changes and active tab is in this lane, `tabElementRef.scrollIntoView({ inline: "nearest", block: "nearest" })`

**Unpinned lane behavior:**
- `flex-1 min-w-0`
- If `overflowMode === "scroll"`: `overflow-x-auto flex`
- If `overflowMode === "pagination"`: show only a window of tabs + chevron buttons left/right (page index in local React state OR derive from active tab index)
- Always auto-reveal active tab on focus change

#### 4.4 `preview-tab.tsx`

Props:

```tsx
type PreviewTabProps = {
  tab: PreviewTab;
  isActive: boolean;
  compression: "normal" | "compact" | "icon-only";
  onSelect: () => void;
};
```

Visual classes (Tailwind — tune but preserve intent):

| State | Classes (indicative) |
|---|---|
| Active | `bg-background text-foreground rounded-t-md border border-b-0 border-border min-w-[8rem] z-10 -mb-px` |
| Inactive | `bg-transparent text-muted-foreground hover:bg-muted/60 rounded-t-md min-w-[4.5rem] max-w-[10rem]` |
| Removed | `opacity-70` + destructive hint on icon; still clickable to show removed stage |

Content by compression:

- **normal:** `[icon] [truncate title] [kebab]`
- **compact:** smaller padding, tighter max-width, shorter truncate
- **icon-only:** `[icon] [kebab]` — title in tooltip only

**Active tab is wider:** use larger `min-w-*` on active vs inactive (e.g. active `min-w-32`, inactive `min-w-16` max-w-24).

Pin indicator: small pin icon or codicon when `tab.pinned` (even if inactive).

Kebab: always render `PreviewTabMenu` — critical for icon-only pinned tabs.

Accessibility:

```tsx
<button role="tab" aria-selected={isActive} type="button" onClick={onSelect}>
```

Wrap title in `Tooltip` when truncated or icon-only.

#### 4.5 `preview-tab-menu.tsx`

Menu items (mirror `FileRowMenu` portal pattern):

| Item | Enabled when | Action |
|---|---|---|
| Pin | `!tab.pinned` | `pinTab(tabId)` |
| Unpin | `canUnpinTab(tab)` | `unpinTab(tabId)` |
| Duplicate | `canDuplicateTab(tab)` | `duplicateTab(tabId)` |
| Close | `canCloseTab(tab)` | `closeTab(tabId)` |
| Close (disabled) | `tab.pinned` | show grayed, `aria-disabled`, no handler |

Do **not** hide Close when pinned — show disabled for discoverability.

#### 4.6 `tab-strip-settings-menu.tsx`

Strip-level kebab (right end of strip). Items:

- Overflow: **Scroll** (radio/check mark when active)
- Overflow: **Pagination**

Calls `setOverflowMode("scroll" | "pagination")` — persistence handled in store.

Optional later: "Close all unpinned" → `closeAllUnpinned()`.

#### 4.7 `preview-stage.tsx`

Props: `activeTab: PreviewTab | null`, `hasTabs: boolean`, `filesEmpty?: boolean`

States:

1. **No tabs, files exist:** Empty — "Select a file to preview" + hint to click file in left panel
2. **No tabs, no files:** Empty — link to upload (reuse copy tone from `FilesEmptyState`)
3. **Active tab `lifecycle === "ready"`:** Placeholder — filename as title, subline "Preview coming soon", file type icon
4. **Active tab `lifecycle === "removed"` or `"error"`:** Empty with destructive media — "File could not be preview" + `errorMessage` if set
5. **Active tab `lifecycle === "loading"`:** Optional skeleton (nice-to-have)

Stage must visually connect to active tab: no gap between strip and stage; active tab's bottom border merges with stage top (`bg-background` continuity).

### 5. Compression algorithm (pinned lane)

Use `ResizeObserver` on the pinned lane container.

Constants (tune in implementation):

```ts
const PINNED_TAB_NORMAL_MIN = 96;   // px — icon + truncated label + kebab
const PINNED_TAB_ICON_ONLY = 40;    // px — icon + kebab
const PINNED_LANE_MAX_RATIO = 0.5;  // optional: pinned lane won't exceed 50% of strip width before unpinned gets room
```

Stages:

1. **normal** — each tab at normal min-width
2. **compact** — reduce min-width / max-width, stronger truncate
3. **icon-only** — hide title text, tooltip only
4. **scroll-fallback** — lane gets `overflow-x-auto`; enable scroll when total min-width > container width even at icon-only

Unpinned lane: compress less aggressively; active tab keeps wider min-width than siblings.

**Do not block pinning in Phase 7 UI** — reducer allows unlimited pins; UI degrades visually.

### 6. Unpinned pagination mode

When `overflowMode === "pagination"`:

- Measure how many tabs fit in unpinned lane width (divide by estimated tab width)
- Keep a `pageStartIndex` in component state
- When active tab changes, adjust page so active tab is visible
- Render chevrons ‹ › at lane edges to shift window
- Default visible count ~3 if measurement unavailable (fallback)

When `overflowMode === "scroll"`:

- Native horizontal scroll on unpinned lane
- `scrollIntoView` on active tab change

### 7. Build order (strict)

1. `preview-file-type-icon.tsx` — smallest leaf
2. `preview-tab-menu.tsx` + `tab-strip-settings-menu.tsx` — menus work in isolation
3. `preview-tab.tsx` — visual states
4. `preview-tab-lane.tsx` — lane + compression hook
5. `preview-tab-strip.tsx` — compose lanes + divider
6. `preview-stage.tsx` — empty/placeholder/removed
7. `preview-center-panel.tsx` — glue
8. Wire `page.tsx` center section
9. Wire `FileList` click → `openTab`
10. Manual pass: pin, unpin, duplicate, close, overflow toggle, refresh page (overflow persists)

### 8. What NOT to do

- ❌ Do not modify `reducer.ts` unless you find a bug — fix reducer + tests together
- ❌ Do not add `fileId` field back to `PreviewTab` (use `resourceKey` only)
- ❌ Do not implement PDF/docx/image rendering
- ❌ Do not wire `markResourceRemoved` yet (Phase 8)
- ❌ Do not persist open tabs to localStorage
- ❌ Do not put overflow setting inside per-tab kebab
- ❌ Do not auto-duplicate on file click
- ❌ Do not close pinned tabs from UI without unpin first
- ❌ Do not render divider when `pinnedTabs.length === 0`

### 9. Manual test checklist (Phase 7 sign-off)

- [ ] Click file in left list → tab opens, stage shows placeholder
- [ ] Click same file again → focuses existing tab (no duplicate)
- [ ] Open 2 tabs, duplicate one → two tabs same file, independent instances
- [ ] Close active tab → nearest left/right activates
- [ ] Pin tab → moves to pinned lane; close disabled in kebab; survives close-all-unpinned (if exposed)
- [ ] Unpin → moves to unpinned lane; MRU updated (focus same file from tree picks unpinned if MRU)
- [ ] Toggle overflow scroll ↔ pagination; refresh page → mode persists
- [ ] Many tabs → active stays wider; pinned compress before unpinned
- [ ] Many pinned tabs → icon-only → scroll fallback; active pinned tab scrolls into view
- [ ] Dev: `markResourceRemoved(resourceKey)` → tab shows removed; stage error; duplicate disabled
- [ ] `npm run test` / `tsc --noEmit` / `eslint` clean

### 10. Verification commands

```bash
cd frontend && npm run test
cd frontend && npx tsc --noEmit
cd frontend && npm run lint
cd frontend && npm run build
```
Reducer/selectors are framework-agnostic pure functions, independently tested without React or zustand. `store.ts` is the only place zustand appears — chosen because this session introduced it as the app's first non-`useState` state container (see [[Current-Context]]). No ADR needed yet; this isn't a cross-cutting architecture decision, just this one subsystem's internal state management choice.

## Open questions
- Resolved (Phase 8): `markResourceRemoved` triggers via `useSyncRemovedPreviewTabs`, a `useEffect` re-running the diff whenever `files` *or* `tabs` changes (not gated to poll ticks only) — see Phase 8 section above.
- Should duplicate/pin/close actions be reachable from more than the tab kebab (e.g. file-tree right-click) once UI wiring starts?

## Related
- [[FEAT-app-shell-layout]] — the app shell the middle pane belongs to; center panel placeholder should be updated once tabs land.
- [[Current-Context]] — resolves "translate the tab-previewer design into an implementation-ready plan" open item.
