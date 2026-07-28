---
type: product
status: active
tags: [area/frontend, area/design]
created: 2026-07-01
updated: 2026-07-28
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
| Top toolbar | Same as page well (`bg-muted`) — no white bar / border |
| Page well | `bg-muted` — shows through gutters / around panels |
| All three panels | White (`bg-background`), `rounded-2xl` |
| Icon default | `text-muted-foreground` |
| Icon hover | `hover:bg-muted`, `hover:text-foreground` |
| Resize gutter | Invisible — well color only (no divider line) |
| Disclaimer footer | `text-xs text-muted-foreground` |

Theme: Settings → **Theme** tab (Light / Dark / System). Preference stored in `localStorage` (`sage_theme`); boot script + root `ThemeProvider` on `<html>` prevent flash and keep System in sync. Dark tokens use `:root.dark` **after** `:root` (higher specificity — see [[Lessons-Learned#2026-07-19 — `:root` after `.dark` cancels dark mode]]). Structure matches light — `muted` = recessed page well, `background` = elevated panels — with stronger `muted-foreground` for secondary text. Prefer semantic tokens (`bg-background`, `text-muted-foreground`, `border-border`); avoid hardcoded `neutral-*` page wells.

### Spacing & sizing
| Element | Size |
|---|---|
| Top toolbar height | `h-12` (48px), on muted well |
| Panel internal header | `h-14` |
| Panel corner radius | `rounded-2xl` (kept when a side is collapsed) |
| Panel row inset | `p-2` (`pb-0` above footer) |
| Panel gutter / resize track | `0.5rem` (8px) |
| Icon button hit target | `size-8` (32px) |
| Icon group gap | `gap-0.5` inside pill; `gap-2` between pills |
| Resize drag hit area | `w-4` (16px), centered over gutter — no visible chrome |
| Disclaimer footer | `py-1.5`, centered |

### Layout shell
```txt
┌─────────────────────────────────────────────┐
│ [icons]                         [icons]     │  ← muted well (no white bar)
│ ╭────────╮   ╭──────────────╮   ╭────────╮  │
│ │ Left   │   │ Center (1fr) │   │ Right  │  │
│ │ panel  │   │              │   │ panel  │  │
│ ╰────────╯   ╰──────────────╯   ╰────────╯  │
│     Sage can be inaccurate; …               │  ← disclaimer
└─────────────────────────────────────────────┘
```

- Outer shell: `flex h-full flex-col overflow-hidden bg-muted`.
- Top toolbar: `h-12` on the well (no `bg-background` / no border).
- Panel row: `grid min-h-0 flex-1 px-2 pb-0`.
- Each panel: `rounded-2xl bg-background overflow-hidden`; internal header `shrink-0`, body `min-h-0 flex-1`.
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

## `HeaderIconGroup` + `HeaderIconButton` pattern

Canonical implementation: `frontend/src/app/page.tsx`.

Related icon buttons sit inside a shared pill shell (`HeaderIconGroup`). Primary CTAs (`New chat`) stay outside utility pills; Profile uses its own solo pill. Separate pills with `gap-2` (not `|` dividers). See [[Reusable-Patterns#HeaderIconGroup (pill shell)]].

### Group shell
```tsx
className="flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm"
```

### Button
```tsx
className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
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
- Grid gutter track is **`0.5rem`**; wider hit area is **absolutely positioned** over it (`w-4`, `left-1/2 -translate-x-1/2`).
- Resizer is **fully invisible** (no line, no hover fill) — the muted well is the only visual separation.
- Do **not** put `w-4` directly as the grid track width — hit area won't work correctly.
- Resize changes saved width; does not affect visibility state.
- Min side width **16%** (`MIN_SIDE_WIDTH` in `page.tsx`); min center **16%** (`MIN_MIDDLE_WIDTH`). Default sides **30%**.

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

## Preview tab strip

Visual reference: Chrome/Obsidian — active tab attached to content surface; crowded strip compresses by truncation, not by hiding semantics.

### Ownership
- **Tab-strip / workspace-level controls** live outside individual tab menus (overflow mode).
- **Tab-level controls** stay inside the tab or its kebab (pin/unpin, duplicate, close).

### Behavior (state from `frontend/src/lib/preview-tabs/`)
- Overflow mode: `pagination` | `free horizontal scroll`; changed from **tab-strip settings** kebab, not per-tab menu. Persisted in `localStorage` (`sage_preview_tab_overflow_mode`).
- Clicking a file that's already open focuses the **most recently active** matching tab; duplication is explicit only.
- Pinned tabs: left cluster; protected from direct close; survive `close all`; kebab shows **Close** as **disabled** while pinned.

### Layout: two regions
```txt
[ pinned lane ][ divider? ][ unpinned lane ][ strip settings ]
```
- Divider renders **only** when pinned tabs exist.
- Pinned lane: fixed left; compresses first; may become icon-only; **last resort** independent horizontal scroll with auto-reveal for active pinned tab.
- Unpinned lane: overflow per workspace preference; active tab always visible.

### Width under pressure
| Priority | Rule |
|---|---|
| Active tab | Stays wider than neighbors |
| Pinned cluster | Compresses before unpinned region |
| Pinned minimum | Icon-only acceptable at extreme compression; full name via tooltip; kebab always reachable |
| Unpinned minimum | Icon + truncated filename longer than pinned icon-only stage |

### Tab visuals
- **Active:** elevated, connected to preview stage (`bg-background` continuity with panel body).
- **Inactive:** lower contrast.
- **Removed:** same tab shell; error styling; stage shows empty-state with destructive treatment.

### Tooltips
- Full filename on truncated tabs. Touch: long-press or focus equivalent — don't rely on hover-only.

### Empty states (all panels / standalone views)
Use the shared `Empty` primitives from `@/components/ui/empty` — same structure everywhere:

```tsx
<Empty className="h-full border-none px-4">  // h-full when filling a panel body
  <EmptyHeader>
    <EmptyMedia variant="icon">{icon}</EmptyMedia>
    <EmptyTitle>…</EmptyTitle>
    <EmptyDescription>…</EmptyDescription>
  </EmptyHeader>
  <EmptyContent>{optional CTA Button}</EmptyContent>
</Empty>
```

Canonical examples: `FilesEmptyState` / `AskAiEmptyState` in `page.tsx`; `AccountsEmptyState` in `accounts-table.tsx`. Do **not** hand-roll dashed boxes with custom heading sizes — icon disc, title weight, and description color come from the shared component.

**Organization accounts — three mutually exclusive states** (see `organization-view.tsx`):

| State | Condition | UI |
|---|---|---|
| Loading | `accounts === undefined` && no load error | `AccountsTableSkeleton` (pulse) |
| Empty | `accounts.length === 0` after load | `AccountsEmptyState` in bordered card — **no ghost rows** |
| Populated | `accounts.length > 0` | Real table |

Use `accounts === undefined` for first load — not `accounts.length === 0` — so an empty array never renders while data is still in flight.

- **Loading skeleton** (`AccountsTableSkeleton`) = data incoming → `animate-pulse`.
- **Empty** = shared `Empty` only; do not stack an empty overlay on ghost/skeleton rows.

## Styling stack
- Tailwind CSS 4 utility-first.
- Do not introduce a second styling system without an ADR.

## Surfaces (dialogs)

**Primary axis: `kind`** — not size.

| Kind | Footer | X button |
|---|---|---|
| `form` | **Discard** + **Save** | Discards draft |
| `confirm` | **Cancel** + `{Verb}` | Cancel (safe exit) |

**Secondary axis: `size`**

| Size | Width | Use |
|---|---|---|
| `sm` | `max-w-md` | Configure chat, confirms |
| `lg` | `max-w-2xl` | Settings (floating nav + content panels) |

**Shell structure:** Header (fixed) → Body (scroll) → Footer (fixed). Legacy `DialogContent` (no `variant="shell"`) unchanged for older dialogs until migrated.

**Fields:** `FieldInput` / `FieldTextArea` — `rounded-full`, `border-border`, `shadow-sm`, `ring-2` on focus.

**Segmented control:** `outline` unselected / `default` selected; 2 options → `HeaderIconGroup`-style shell + divider; 3+ → wrap row.

**Copy:** American English.

## Toasts (application-owned)

- **Provider:** `ToastProvider` in `layout.tsx` — global, not Ask-panel-owned
- **Host:** portal to `document.body`, `fixed top-14 right-4`, **`z-[100]`** (above dialog `z-50`) — same stacking root as modals so Save feedback isn’t trapped under the backdrop or inside a collapsible panel
- **Stack:** max 3; 4s auto-dismiss (hover pauses); **errors sticky**
- **Layout:** compact iOS-style row — `[icon | title + description]`; `py-2`; icon↔text gap `2px`; no muted icon disc; `rounded-2xl`; fixed width, height grows with content; stack grows downward
- **Dismiss:** hover-only `X` overlay, slightly overlapping top-left corner (`aria-label="Dismiss"`; visible on focus too)
- **No toast action buttons** — keep CTAs in-page / dialogs
- **Variants:** `success`, `error`, `info`, `progress` (+ `update` for progress)
- **API:** `useToast()` → `.success()`, `.error()`, `.info()`, `.progress()`, `.dismiss()`
- **Deprecated:** `ToastViewport` is a no-op — do not nest toast hosts in panel columns

## Skeletons

- **Primitive:** `Skeleton` — `animate-pulse`, `rounded-full`, `aria-hidden`
- **Pairs:** `FileListSkeleton`, `SettingsFormSkeleton`, `AccountsTableSkeleton`
- **Rule:** parent owns fetch/state; skeleton is UI-only. Branch on **data state** (`data === undefined` → skeleton); use `isRefreshing` only when data already exists. Never `isLoading` flags in `try/finally`.

**Deferred:** popover forms. Persistence: [[TODO-settings-persistence]].

## Design principles (emerging)
- **Floating panel chrome** — rounded panels on a muted well with invisible gutters (NotebookLM-inspired); icons/tooltips/resize behavior still lean VS Code / Cursor.
- **VS Code / Cursor familiarity** — icons, tooltips, and panel toggle/resize state model should feel like a code editor shell.
- **Hotel-staff constraints** — interruption-driven, shared desks, minimal training, speed over polish. See [[Workspace-UI-Design-Decisions#Hotel staff design constraints (personas & environment)]].
- **Recognizable icons for structural actions** — tooltips are last-resort for power features; collapse/close-like glyphs need established conventions.
- **Coherent zero-state** — three panels should guide one first-run flow, not pretend the others don't exist.
- **Additive UI work** — build shell patterns in place first; extract components when boundaries stabilize (see [[Current-Context#Code organization philosophy]]).
- **Separate resize state from visibility state** — matches how Cursor handles sidebars.

## When to update this file
- New global UI pattern (button radius, motion, typography scale).
- Tooltip or icon convention changes.
- New panel type or layout region added.
