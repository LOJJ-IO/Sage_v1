---
type: feature
status: in-progress
tags: [area/frontend, area/design]
created: 2026-06-30
updated: 2026-07-03
related: ["[[UI-UX-Guidelines]]", "[[Reusable-Patterns]]", "[[Current-Context]]"]
---

# FEAT: App shell layout

## Status
`in-progress` — layout shell, headers, icons, resize/toggle, dark mode, and placeholder panel content shipped in UI; real file tree, editor, and chat backend not yet built.

## Problem
Sage needs a VS Code / Cursor–style application shell: resizable side panels, a flexible center area, and icon-driven navigation in headers — before real product features land.

## Solution
A three-column layout inside `frontend/src/app/page.tsx`:

```txt
[ global header — 48px ]
[ left panel | resize | center | resize | right panel ]
```

- **Left panel** (`bg-neutral-100` / `dark:bg-neutral-900`): internal 48px header with centered action icons; body shows `FilesEmptyState` (shadcn `Empty`).
- **Center** (`bg-white` / `dark:bg-neutral-950`): empty — no placeholder yet.
- **Right panel** (`bg-neutral-100` / `dark:bg-neutral-900`): `AskAiEmptyState` + `AskAiChatInput` at bottom (UI only).

Panels start at **30% / 40% / 30%** width. Side panels are resizable and toggleable.

## Out of scope (for this feature)
- File tree content
- Editor / main workspace content
- Right panel content
- Persisting panel widths to localStorage
- Keyboard shortcuts
- Pixel-based panel widths (currently percentage-based)

## UI/UX
Full conventions in [[UI-UX-Guidelines]]. Summary:

### Global header (`h-12` / 48px, white)
**Left group** (after sidebar toggle, separated by vertical divider):
| Icon | Source | Tooltip | Active? |
|---|---|---|---|
| Sidebar toggle | Codicon `layout-sidebar-left-off` / `layout-sidebar-left` | Collapse | Yes — toggles `isLeftVisible` |
| Files | Codicon `folder-library` | Files | No |
| Search | Codicon `search` | Search | No |
| Upload | Tabler `IconFileUpload` | Upload | No |
| Bookmarks | Codicon `bookmark` | Bookmarks | No |

**Right** (dark-mode toggle, vertical separator, then sidebar toggle):
| Icon | Source | Tooltip | Active? |
|---|---|---|---|
| Dark mode | Tabler `IconMoon` / `IconSun` | Dark mode / Light mode | Yes — toggles `isDark` on `<html>` |
| *(separator)* | `mx-2 h-5 w-px bg-neutral-200 dark:bg-neutral-700` | — | — |
| Sidebar toggle | Codicon `layout-sidebar-right-off` / `layout-sidebar-right` | Collapse | Yes — toggles `isRightVisible` |

Left group also has a vertical separator after the sidebar toggle (same classes). Sidebar toggle tooltips use **side placement** (left toggle → tooltip to the right; right-side icons → tooltip to the left).

### Left panel internal header (`h-12` / 48px, centered icons)
| Icon | Source | Tooltip | Active? |
|---|---|---|---|
| Sort | Tabler `IconFilter2Up` | Sort | No |
| New folder | Codicon `new-folder` | New folder | No |
| Auto sort | Tabler `IconFilter2Spark` | Auto-Sort | No |
| Fold / unfold | Codicon `fold` / `unfold` | Fold / Unfold | Yes — toggles `isFolded` (UI only until file tree exists) |
| Auto-reveal | Composite Tabler `IconFile` + `IconPin` (pin bottom-right) | Auto-reveal current file | No |

### Resize behavior
- Drag handles between panels: **2px visible line** (`w-0.5`), **16px hit area** (`w-4` button absolutely centered over the 2px grid track).
- Hover on hit area: `bg-neutral-200/20`.
- `MIN_SIDE_WIDTH = 12%`, `MIN_MIDDLE_WIDTH = 16%`, `DEFAULT_SIDE_WIDTH = 30%`.
- Resize updates **saved width** (`leftWidth` / `rightWidth`).
- Dragging a hidden panel's handle **re-shows** that panel.

### Toggle behavior (visibility vs width)
Resize and toggle are **separate state** (Cursor/VS Code model):
- `leftWidth` / `rightWidth` — saved panel widths (percent).
- `isLeftVisible` / `isRightVisible` — visibility only.
- Hidden panel width becomes `0px` in grid; shown panel restores saved width.
- Toggle does **not** mutate saved width.

## Technical approach
- Single file for now: `frontend/src/app/page.tsx` (~347 lines). shadcn primitives in `frontend/src/components/ui/`. Intentional during early additive UI work — see [[Current-Context#Code organization philosophy]].
- CSS Grid for column layout: `gridTemplateColumns: left 0.125rem 1fr 0.125rem right`.
- Middle column uses `minmax(0, 1fr)` so it absorbs remaining space when sides are hidden or resized.
- `HeaderIconButton` component (inline in `page.tsx`) for all icon buttons + tooltips.
- Icon libraries: `@vscode/codicons` (CSS imported in `layout.tsx`), `@tabler/icons-react` for icons Codicons doesn't cover.

## Open questions
- When to extract `page.tsx` into components/hooks (see [[Current-Context]]).
- Whether panel widths should move to pixels for production fidelity.
- What the right panel is for.

## Related
- [[UI-UX-Guidelines]]
- [[Reusable-Patterns]]
- Canonical implementation: `frontend/src/app/page.tsx`
