---
type: product
status: active
tags: [area/frontend, area/design]
created: 2026-07-01
updated: 2026-07-07
related: ["[[Product-Vision]]", "[[FEAT-app-shell-layout]]", "[[Reusable-Patterns]]", "[[Workspace-UI-Design-Decisions]]"]
---

# UI/UX Guidelines

Conventions for how Sage looks and behaves. Update when a pattern is established beyond one component — don't let decisions live only in code.

**Workspace product decisions (zero-states, tabs, personas):** [[Workspace-UI-Design-Decisions]] — authoritative for *what* to build; this file is for *how it looks*.

Feature-level detail for the current shell: [[FEAT-app-shell-layout]].

## Visual language

### Palette (current)
| Area | Color |
|---|---|
| Global header | White (`bg-white`), border `neutral-200` |
| Left / right panels | Light gray (`bg-neutral-100`) |
| Center (editor area) | White (`bg-white`) |
| Icon default | `text-neutral-600` |
| Icon hover | `hover:bg-neutral-200`, `hover:text-neutral-950` |
| Resize divider line | `bg-neutral-300`, hover `neutral-500` |
| Resize hit-area hover | `bg-neutral-200/20` (subtle) |

Dark global header (`#262626`) was tried and **reverted**. Dark mode now uses token-based `dark:` variants (header `dark:bg-neutral-950`, panels `dark:bg-neutral-900`) toggled via sun/moon in the global header right group.

### Spacing & sizing
| Element | Size |
|---|---|
| Global header height | `h-12` (48px) |
| Left panel internal header | `h-12` (48px) |
| Icon button hit target | `size-8` (32px) |
| Icon group gap | `gap-1` |
| Header icon-group separator (both sides) | `mx-2 h-5 w-px bg-border` — left: after sidebar toggle, before nav icons; right: after dark-mode toggle, before sidebar collapse |
| Resize visible line | `w-0.5` (2px) |
| Resize drag hit area | `w-4` (16px), centered over 2px track |
| Grid divider tracks | `0.125rem` (2px) |

### Layout shell
```txt
┌─────────────────────────────────────────────┐
│ Global header (48px)                        │
├──────────┬─┬──────────────────┬─┬──────────┤
│ Left     │││ Center (1fr)     │││ Right    │
│ panel    │││                  │││ panel    │
│ ┌──────┐ │││                  │││          │
│ │ hdr  │ │││                  │││          │
│ ├──────┤ │││                  │││          │
│ │ body │ │││                  │││          │
│ └──────┘ │││                  │││          │
└──────────┴─┴──────────────────┴─┴──────────┘
```

- Outer shell: `flex min-h-screen flex-col`.
- Panel row: `grid min-h-0 flex-1`.
- Left panel: `flex flex-col overflow-hidden`; internal header `shrink-0`, body `min-h-0 flex-1`.
- Use `min-h-0` on flex/grid children to prevent vertical overflow when headers are stacked.

Default widths: left **30%**, center **40%** (via `1fr`), right **30%**.

## Icons

### Libraries
- **Primary:** `@vscode/codicons` — loaded via `import "@vscode/codicons/dist/codicon.css"` in `frontend/src/app/layout.tsx`. Render as `<span className="codicon codicon-<name>" />`.
- **Secondary:** `@tabler/icons-react` — when Codicons lacks the icon or a custom composite is needed.

### Icon weight / blending
Codicons get a subtle stroke so they match Tabler weight:
```tsx
className="codicon ... [-webkit-text-stroke:0.35px_currentColor]"
```

Tabler icons in headers use the `TablerIcon` helper:
```tsx
const ICON_SIZE = 20;
const ICON_STROKE = 2.6;

<Icon size={ICON_SIZE} stroke={ICON_STROKE} className="text-current" />
```

Constants in `page.tsx`: `ICON_SIZE = 20`, `ICON_STROKE = 2.6`. Codicons in the same toolbar use `style={{ fontSize: ICON_SIZE }}`.

## `HeaderIconButton` pattern

Canonical implementation: `frontend/src/app/page.tsx`.

All header icon buttons (global + left panel internal) use this component.

### Button
```tsx
className="group relative flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
```

Accepts either:
- `iconClass` — Codicon class string, or
- `icon` — custom React node (Tabler icon, composite, etc.)

### Tooltips
Black compact tooltip, **not** browser `title`. Rendered via **portaled** shadcn/Base UI `Tooltip` (`TooltipPrimitive.Portal` → `document.body`). See [[Stacking-Contexts-and-Portals#Sage implementation]].

| Property | Value |
|---|---|
| Component | `TooltipContent variant="compact"` in `frontend/src/components/ui/tooltip.tsx` |
| Background | `bg-black` |
| Text | `text-[12px] font-semibold leading-none text-white` |
| Padding | `px-2.5 py-1.5` |
| Shadow | `shadow-md` |
| Show on | Base UI hover + focus (replaces CSS `group-hover` on nested spans) |
| Caret | `TooltipPrimitive.Arrow` — `size-2 bg-black` |

**Placement** (`side` on `TooltipContent`):
- `bottom` (default) — centered below icon. Most global + panel header icons.
- `right` — left sidebar toggle.
- `left` — right sidebar toggle.

`sideOffset`: `6` bottom, `8` left/right (matches prior `mt-1.5` / `mr-2` / `ml-2` spacing).

Do **not** use large tooltip sizing (`text-sm`, heavy padding) — reference is VS Code compact tooltips. Do **not** use nested `absolute` tooltips inside buttons — they fail stacking-context and overflow tests; always portal.

## Panel resize

See [[Reusable-Patterns#Resizable panel divider]].

Key rules:
- Grid track is **2px**; wider hit area is **absolutely positioned** over it (`w-4`, `left-1/2 -translate-x-1/2`).
- Do **not** put `w-4` directly in a 2px grid column — it won't work as a hit target.
- Resize changes saved width; does not affect visibility state.
- Min side width **14%** (`MIN_SIDE_WIDTH` in `page.tsx`); min center **16%** (`MIN_MIDDLE_WIDTH`). Default sides **30%**.

## Panel toggle (visibility)

Key rules:
- `isLeftVisible` / `isRightVisible` are separate from `leftWidth` / `rightWidth`.
- Hidden → `0px` grid column. Shown → saved `%` width.
- Toggle label: **Collapse** (both sides).
- Codicon: `layout-sidebar-*-off` when visible, `layout-sidebar-*` when hidden.
- Dragging resize handle on hidden panel sets visibility back to `true`.

## Left panel header icons

Centered horizontally (`flex justify-center`) — stays centered as panel resizes.

Collapse all:
- `codicon-collapse-all`, tooltip **Collapse all**
- Collapses all folders in the file tree (VS Code convention). UI only until file tree exists; no `onClick` wired yet.

## Styling stack
- Tailwind CSS 4 utility-first.
- Do not introduce a second styling system without an ADR.

## Design principles (emerging)
- **VS Code / Cursor familiarity** — layout, icons, tooltips, and panel behavior should feel like a code editor shell.
- **Hotel-staff constraints** — interruption-driven, shared desks, minimal training, speed over polish. See [[Workspace-UI-Design-Decisions#Hotel staff design constraints (personas & environment)]].
- **Recognizable icons for structural actions** — tooltips are last-resort for power features; collapse/close-like glyphs need established conventions.
- **Coherent zero-state** — three panels should guide one first-run flow, not pretend the others don't exist.
- **Additive UI work** — build shell patterns in place first; extract components when boundaries stabilize (see [[Current-Context#Code organization philosophy]]).
- **Separate resize state from visibility state** — matches how Cursor handles sidebars.

## When to update this file
- New global UI pattern (button radius, motion, typography scale).
- Tooltip or icon convention changes.
- New panel type or layout region added.
