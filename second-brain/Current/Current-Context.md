---
type: context
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-07-03
related: ["[[Roadmap]]", "[[Architecture-Overview]]", "[[FEAT-app-shell-layout]]", "[[UI-UX-Guidelines]]", "[[BUG-0001-ui-inconsistencies]]"]
---

# Current Context

**Read this first.** This file should always reflect *right now* — overwrite stale sections, don't append forever.

## Where the project is

Sage is early-stage. `frontend/` is a Next.js 16 / React 19 app building a VS Code–style application shell. Almost all UI currently lives in a single file: `frontend/src/app/page.tsx` (~347 lines). shadcn/ui components live under `frontend/src/components/ui/`. `backend/` exists as an empty directory.

## Active work

- **App shell layout** — resizable/toggleable left & right side panels, global header, left panel internal header with icons. See [[FEAT-app-shell-layout]] and [[UI-UX-Guidelines]].
- **Dark mode** — client-side toggle in global header (sun/moon); `dark` class on `<html>`.
- Panel **content** is placeholder UI only: `FilesEmptyState` (left), `AskAiEmptyState` (right), empty center, `AskAiChatInput` stub (right). No real file tree, editor, or chat backend.
- No backend work started.

## What's built (UI)

| Area | Status |
|---|---|
| Three-column resizable layout | Done |
| Global header (48px) with icon groups + dark mode toggle | Done |
| Header vertical separators (left + right icon groups) | Done |
| Dark mode (class toggle, `dark:` tokens) | Done |
| Left panel internal header (48px) with centered icons | Done |
| Side panel toggle (visibility, separate from width) | Done |
| Resize handles (2px line, 16px hit area) | Done |
| `HeaderIconButton` + compact black tooltips | Done |
| Fold/unfold icon toggle (UI state only) | Done |
| Empty state — left panel (`FilesEmptyState`) via shadcn `Empty` | Done (UI only) |
| Empty state — right panel (`AskAiEmptyState`) via shadcn `Empty` | Done (UI only) |
| Center panel content | **Empty** — no placeholder yet |
| Right panel chat input (`AskAiChatInput`, voice + send buttons) | Done (UI only) |
| File tree / editor / real chat | Not started |

## Known bugs / inconsistencies

Tracked in detail: [[BUG-0001-ui-inconsistencies]]. Summary:

| # | Area | Bug |
|---|---|---|
| 1 | Icons | Tabler header icons (`TablerIcon`) use `stroke={2.6}`; Codicons use `0.35px` webkit text-stroke — Upload looks heavier than Fold/Unfold and other Codicons in the same toolbar pattern. |
| 2 | Icons | Tabler stroke/size not unified: headers `2.6`, empty states `2`, chat mic `2` / send `18px`+`2` — bypass `TablerIcon` helper in several places. |
| 3 | Buttons | Three button implementations coexist: shadcn `Button`, custom `HeaderIconButton`, raw `<button>` (chat + resize handles) — no shared variant system. |
| 4 | Icons | Upload in empty-state `Button` uses bare `IconUpload` (Tabler defaults); header Upload uses `TablerIcon` — same icon, different weight. |
| 5 | Panel layout | **Docs vs code:** [[FEAT-app-shell-layout]] previously said `AskAiEmptyState` in center; code has **empty center panel** and `AskAiEmptyState` in **right** panel only. |
| 6 | Docs | [[FEAT-app-shell-layout]] left-panel icon table stale — docs list `IconFilter2Up`, `IconFilter2Spark`, file+pin composite; code uses `IconArrowsSort`, `IconWand`, `IconEyeQuestion`. Global header docs say `IconFileUpload`; code uses `IconUpload`. |
| 7 | Design tokens | Chat input + `HeaderIconButton` use hardcoded `neutral-*` classes; shadcn `Button`/`Empty` use CSS variables (`--primary`, `--muted`) — two styling systems in one UI. |
| 8 | Dark mode | Toggle is client-only; no `localStorage`, no `prefers-color-scheme` — resets on refresh. |
| 9 | Placeholder UI | Upload button, voice, and send have no handlers — visual only. |
| 10 | Config | `components.json` sets `iconLibrary: lucide`; app uses Tabler + Codicons. |
| 11 | Metadata | `layout.tsx` still has Next.js scaffold title/description ("Create Next App"). |
| 12 | Dev env | `@import "tw-animate-css"` in `globals.css` may fail under Turbopack until cache clear or explicit import path. |

## Open questions

- Backend stack not decided — log as ADR when chosen.
- When to extract `page.tsx` into components (see below).
- Whether panel widths should become pixel-based for production.
- Product vision still placeholder — see [[Product-Vision]].

## Code organization philosophy

**Current approach:** keep the app shell in one file (`page.tsx`) while the UI shape is still being discovered. This is intentional and normal at this stage.

Inspired by *additive programming* (SICP): add new behavior without breaking existing behavior; minimize premature assumptions about how the app will be used. That means **flexibility in design**, not "never split files."

**When to extract** (senior-engineer rule of thumb):
- A piece has a clear, stable responsibility (`AppHeader`, `LeftPanelHeader`, `ResizableLayout`, `usePanelResize`).
- Changing one feature requires scrolling past unrelated code.
- Reuse appears across multiple areas.
- File tree / editor add real state that doesn't belong in layout code.

**Don't extract yet** just to hit an arbitrary line count — extract when boundaries are real.

Likely first extractions: `HeaderIconButton`, resize hook, panel layout component.

## What NOT to re-explain to Claude

- Full UI spec lives in [[UI-UX-Guidelines]] and [[FEAT-app-shell-layout]] — don't re-derive from chat.
- Icon libraries: `@vscode/codicons` + `@tabler/icons-react`.
- Resize vs toggle are **separate state** (`leftWidth`/`rightWidth` vs `isLeftVisible`/`isRightVisible`).
- Global header background: white in light mode, `neutral-950` in dark mode (the old solid `#262626` header experiment was reverted — dark mode now uses token-based `dark:` variants instead).
- Header icon groups separated from sidebar toggles by vertical dividers on **both** sides: `mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700`.
- Dark mode toggle lives in the **right** header group, before its separator and the right sidebar collapse.
- Resize divider: 2px grid track + absolutely positioned `w-4` hit area.
- Tooltip style: compact black, `12px` semibold, not large pills.

## Recently changed

- **2026-07-03** — Right header group vertical separator between dark-mode toggle and sidebar collapse (`837e8335`).
- **2026-07-03** — Dark mode, shadcn empty states, right-panel chat input stub. See [[Daily/2026-07-03]].
- Left panel internal header icons (Sort, New folder, Auto sort, Fold/unfold, Auto-reveal).
- Fold/unfold toggles icon + tooltip based on `isFolded`.
- Sidebar toggle tooltips renamed to **Collapse**, side-placed.
- See [[Daily/2026-06-30]] for earlier shell work.

---
*Update whenever priorities shift. Delete stale lines rather than leaving them.*
