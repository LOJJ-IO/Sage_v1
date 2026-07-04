---
type: context
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-07-03
related: ["[[Roadmap]]", "[[Architecture-Overview]]", "[[FEAT-app-shell-layout]]", "[[UI-UX-Guidelines]]", "[[BUG-0001-ui-inconsistencies]]", "[[Workspace-UI-Design-Decisions]]"]
---

# Current Context

**Read this first.** This file should always reflect *right now* — overwrite stale sections, don't append forever.

## Where the project is

Sage is early-stage. `frontend/` is a Next.js 16 / React 19 app building a **LOJJ workspace shell** (not a document viewer) — three panel slots (file tree, center stage, AI chat) with dockable apps and Cursor-style center tabs planned. Almost all UI currently lives in `frontend/src/app/page.tsx`. shadcn/ui components live under `frontend/src/components/ui/`. `backend/` exists as an empty directory.

**Product UX decisions (July 2026 review):** [[Workspace-UI-Design-Decisions]] — zero-states, tabs, iconography, hotel-staff constraints. Read before proposing workspace UX.

## Active work

- **Next UX (from [[Workspace-UI-Design-Decisions]]):** center panel checklist zero-state (or v1 fallback CTA), coherent three-panel empty flow, AI panel copy fix, collapse-all icon (`codicon-collapse-all`), dock visibility on first load — most not started in code yet.
- **App shell layout** — resizable/toggleable panels, headers, icons. See [[FEAT-app-shell-layout]] and [[UI-UX-Guidelines]].
- **Dark mode** — client-side toggle in global header (sun/moon); `dark` class on `<html>`.
- Panel **content** is placeholder UI only: `FilesEmptyState` (left), `AskAiEmptyState` (right), **empty center** (zero-state planned), `AskAiChatInput` stub (right). No file tree, tabs, dock, or chat backend.
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
| Center panel content | **Empty** — checklist zero-state planned ([[Workspace-UI-Design-Decisions#1. Center panel zero-state]]) |
| Center tabs (Cursor-style) | Not started |
| Dock (connected apps) | Not started |
| Right panel chat input (`AskAiChatInput`, voice + send buttons) | Done (UI only) |
| File tree / editor / real chat | Not started |

## Known bugs / inconsistencies

Tracked in detail: [[BUG-0001-ui-inconsistencies]]. Summary:

| # | Area | Bug |
|---|---|---|
| 1 | Icons | Tabler header icons (`TablerIcon`) use `stroke={2.6}`; Codicons use `0.35px` webkit text-stroke — Upload looks heavier than Fold/Unfold and other Codicons in the same toolbar pattern. |
| 2 | Icons | Tabler stroke/size not unified: headers `2.6`, empty states `2`, chat mic `2` / send `18px`+`2` — bypass `TablerIcon` helper in several places. |
| 3 | Buttons | Three button implementations coexist: shadcn `Button`, custom `HeaderIconButton`, raw `<button>` (chat + resize) — **partial fix 2026-07-03:** chrome buttons now share token-based hover/focus colors with shadcn ghost pattern. Still separate components. |
| 4 | Icons | Upload in empty-state `Button` uses bare `IconUpload` (Tabler defaults); header Upload uses `TablerIcon` — same icon, different weight. |
| 5 | Panel layout | **Docs vs code:** [[FEAT-app-shell-layout]] previously said `AskAiEmptyState` in center; code has **empty center panel** and `AskAiEmptyState` in **right** panel only. |
| 6 | Docs | [[FEAT-app-shell-layout]] left-panel icon table stale — docs list `IconFilter2Up`, `IconFilter2Spark`, file+pin composite; code uses `IconArrowsSort`, `IconWand`, `IconEyeQuestion`. Global header docs say `IconFileUpload`; code uses `IconUpload`. |
| 7 | Design tokens | ~~Chat input + `HeaderIconButton` use hardcoded `neutral-*`~~ — **partial fix 2026-07-03:** shell chrome + `AskAiChatInput` now use theme tokens (`background`, `foreground`, `sidebar`, `border`, `muted`, `secondary`). Tooltips still hardcoded black (VS Code style). |
| 8 | Dark mode | Toggle is client-only; no `localStorage`, no `prefers-color-scheme` — resets on refresh. |
| 9 | Placeholder UI | Upload button, voice, and send have no handlers — visual only. |
| 10 | Config | `components.json` sets `iconLibrary: lucide`; app uses Tabler + Codicons. |
| 11 | Metadata | `layout.tsx` still has Next.js scaffold title/description ("Create Next App"). |
| 12 | Dev env | `@import "tw-animate-css"` in `globals.css` may fail under Turbopack until cache clear or explicit import path. |

## Open questions

- Apps in center: tabs vs. stage-takeover — see [[Workspace-UI-Design-Decisions#3. Apps in the workspace — tabs vs. replace]] (leaning apps-as-tabs).
- State persistence: per-login vs. per-desk on shared front-desk terminals — [[Workspace-UI-Design-Decisions#8. State persistence]].
- Backend stack not decided — log as ADR when chosen.
- When to extract `page.tsx` into components (see below).
- Whether panel widths should become pixel-based for production.

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

- Full UI spec lives in [[UI-UX-Guidelines]], [[FEAT-app-shell-layout]], and [[Workspace-UI-Design-Decisions]] — don't re-derive workspace UX from chat.
- Icon libraries: `@vscode/codicons` + `@tabler/icons-react`.
- Resize vs toggle are **separate state** (`leftWidth`/`rightWidth` vs `isLeftVisible`/`isRightVisible`).
- Global header background uses `bg-background`; side panels use `bg-sidebar`; center uses `bg-background`. Theme tokens in `globals.css` — toggle dark mode via header sun/moon.
- Header icon groups separated from sidebar toggles by vertical dividers on **both** sides: `mx-2 h-5 w-px bg-border`.
- Dark mode toggle lives in the **right** header group, before its separator and the right sidebar collapse.
- Resize divider: 2px grid track + absolutely positioned `w-4` hit area.
- Panel resize mins: `MIN_SIDE_WIDTH = 14%`, `MIN_MIDDLE_WIDTH = 16%`, default sides `30%` — constants at top of `page.tsx`.
- Tooltip style: compact black, `12px` semibold, not large pills.

## Recently changed

- **2026-07-03** — [[Workspace-UI-Design-Decisions]] logged (zero-states, tabs, hotel-staff constraints, open items).
- **2026-07-03** — `MIN_SIDE_WIDTH` 12% → **14%** (tooltip clipping fix on narrow left panel). See [[Lessons-Learned#2026-07-03 — Panel tooltips clipped at minimum resize width]].
- **2026-07-03** — Shell chrome migrated to design tokens (`background`, `sidebar`, `muted`, etc.).
- **2026-07-03** — Tabler icons unified via `TablerIcon`; Ask AI naming; folder empty state uses header Codicon.
- **2026-07-03** — Right header group vertical separator (`837e8335`).
- See [[Daily/2026-07-03]] for earlier Jul 3 work. See [[Daily/2026-06-30]] for initial shell work.

---
*Update whenever priorities shift. Delete stale lines rather than leaving them.*
