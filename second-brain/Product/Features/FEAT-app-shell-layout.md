---
type: feature
status: in-progress
tags: [area/frontend, area/design]
created: 2026-06-30
updated: 2026-07-09
related: ["[[UI-UX-Guidelines]]", "[[Reusable-Patterns]]", "[[Current-Context]]", "[[Workspace-UI-Design-Decisions]]"]
---

# FEAT: App shell layout

## Status
`in-progress` — layout shell, headers, icons, resize/toggle, floating-panel chrome, and placeholder panel content shipped in UI; real file tree, editor, and chat backend not yet built.

## Problem
Sage needs a **workspace shell**: resizable side panels, a flexible center stage (tabs + apps), and icon-driven navigation — before real product features land. Not a document viewer; panels are slots for files, apps, and AI. See [[Workspace-UI-Design-Decisions#Product direction (context)]].

## Solution
A three-column layout inside `frontend/src/app/page.tsx`:

```txt
[ toolbar icons on muted well — no white bar ]
[ padded well: left | gutter | center | gutter | right ]  ← rounded floating panels
[ disclaimer footer ]
```

- **Page well** (`bg-muted`): shows through gutters and around panels; top toolbar sits on the same well (no full-bleed white header).
- **All three panels** (`rounded-2xl bg-background`): same surface fill; radius kept when a side is collapsed.
- **Left**: internal `h-14` header with centered action icons; body shows `FilesEmptyState` / file library.
- **Center**: same panel surface (empty stage for now).
- **Right**: chat title + utility icons; `AskAiEmptyState` + `AskAiChatInput` (UI only).
- **Footer**: thin disclaimer strip under the panel row.

Panels start at **30% / 40% / 30%** width. Side panels are resizable and toggleable. Chrome is NotebookLM-inspired (floating rounded panels, invisible resizer); iconography/behavior still lean VS Code / Cursor.

## Out of scope (for this feature)
- File tree content (beyond empty state)
- Center tab bar and tab groups (see [[Workspace-UI-Design-Decisions#2. Tab model (center panel)]])
- Dock and drag-in apps
- Persisting panel widths to localStorage
- Keyboard shortcuts
- Pixel-based panel widths (currently percentage-based)
- Avatar / account menu (bottom-left — planned separately)

## UI/UX
Full conventions in [[UI-UX-Guidelines]]. Summary:

### Top toolbar (`h-12`, on muted well — no white bar)
**Left** — Collapse pill, then Files / Search / Upload / Bookmarks pill (`gap-2`).
**Right** — Organization (admin) + Profile pill, then Collapse pill.

Sidebar toggle tooltips use **side placement** (left toggle → tooltip to the right; right-side icons → tooltip to the left).

### Left panel internal header (`h-14`, centered icons)
| Icon | Source | Tooltip | Active? |
|---|---|---|---|
| Sort | Tabler `IconArrowsSort` | Sort | No |
| New folder | Codicon `new-folder` | New folder | No |
| Auto sort | Tabler `IconWand` | Auto-Sort | No |
| Auto-reveal | Tabler `IconEyeQuestion` | Auto-reveal current file | No |
| Collapse all | Codicon `collapse-all` | Collapse all | No — UI only until file tree exists |

### Right panel internal header (`h-14`)
Editable chat title + utility pill (New chat / Search chats / History) — all icon-only in `HeaderIconGroup`.

### Resize behavior
- Grid gutter tracks: **`0.5rem` (8px)** — page well shows through (no visible divider line).
- Hit area: **16px** (`w-4`) absolutely centered over the gutter; **fully invisible** (no line, no hover chrome).
- Outer inset: `p-2` on the panel row (`pb-0` so the footer owns the bottom band).
- `MIN_SIDE_WIDTH = 16%`, `MIN_MIDDLE_WIDTH = 16%`, `DEFAULT_SIDE_WIDTH = 30%`.
- Raised from 12% → 14% → 16% so left-panel toolbar tooltips aren't clipped by panel `overflow-hidden` at minimum width. See [[Lessons-Learned#2026-07-03 — Panel tooltips clipped at minimum resize width]].
- Resize updates **saved width** (`leftWidth` / `rightWidth`).
- Dragging a hidden panel's handle **re-shows** that panel.

### Toggle behavior (visibility vs width)
Resize and toggle are **separate state** (Cursor/VS Code model):
- `leftWidth` / `rightWidth` — saved panel widths (percent).
- `isLeftVisible` / `isRightVisible` — visibility only.
- Hidden panel width becomes `0px` in grid; shown panel restores saved width.
- Toggle does **not** mutate saved width.

## Technical approach
- Single file for now: `frontend/src/app/page.tsx`. shadcn primitives in `frontend/src/components/ui/`. Intentional during early additive UI work — see [[Current-Context#Code organization philosophy]].
- CSS Grid: `gridTemplateColumns: left 0.5rem 1fr 0.5rem right` (gutter tracks collapse to `0px` when a side is hidden).
- Shared panel surface class: `rounded-2xl bg-background` (`PANEL_SURFACE` in `page.tsx`).
- Middle column uses `minmax(0, 1fr)` so it absorbs remaining space when sides are hidden or resized.
- `HeaderIconButton` component (inline in `page.tsx`) for icon buttons; tooltips via portaled shadcn `Tooltip` (`variant="compact"`). `TooltipProvider` in `layout.tsx`.
- Icon libraries: `@vscode/codicons` (CSS imported in `layout.tsx`), `@tabler/icons-react` for icons Codicons doesn't cover.

## Open questions
- When to extract `page.tsx` into components/hooks (see [[Current-Context]]).
- Whether panel widths should move to pixels for production fidelity.
- Center zero-state: checklist vs. v1 fallback CTA — [[Workspace-UI-Design-Decisions#1. Center panel zero-state]].

## Related
- [[Workspace-UI-Design-Decisions]]
- [[UI-UX-Guidelines]]
- [[Reusable-Patterns]]
- Canonical implementation: `frontend/src/app/page.tsx`
