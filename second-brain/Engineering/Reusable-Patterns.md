---
type: pattern
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-07-03
related: ["[[Coding-Standards]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]", "[[Lessons-Learned]]"]
---

# Reusable Patterns

Code patterns proven to work in this codebase. Copy instead of reinventing.

## Patterns

### Resizable/toggleable side panel
**Use when:** adding a new dockable panel to the app shell.
**Example:** `frontend/src/app/page.tsx` — left/right panel resize + visibility toggle.
**Key state:**
```tsx
const [leftWidth, setLeftWidth] = useState(30);      // saved width %
const [isLeftVisible, setIsLeftVisible] = useState(true); // visibility only
const MIN_SIDE_WIDTH = 14;  // min % when panel open
const MIN_MIDDLE_WIDTH = 16;
```
**Don't use when:** the UI element isn't a persistent dockable region (use modal/drawer instead, once one exists).

### Resizable panel divider
**Use when:** adding a drag handle between grid/flex columns.
**Example:** `frontend/src/app/page.tsx` — divider between left/center and center/right.
**Shape:**
```tsx
// Grid track: 0.125rem (2px)
<div className="relative h-full">
  <button className="group absolute left-1/2 top-0 z-10 flex h-full w-4 -translate-x-1/2 cursor-col-resize ...">
    <span className="h-full w-0.5 bg-neutral-300 group-hover:bg-neutral-500" />
  </button>
</div>
```
**Why:** grid column stays 2px (visual boundary aligned); `w-4` button overflows for easier grabbing.
**Collapsed panel:** set divider grid track to `0px` and **don't render** the resize handle — otherwise the 16px hit area overflows and causes viewport scrollbars. See [[Lessons-Learned#2026-07-03 — Global scrollbars when collapsing side panels]].
**Don't use when:** putting `w-4` directly as the grid track width — hit area won't work correctly.

### Viewport-locked app shell
**Use when:** building a full-height editor-style layout that must never scroll the document body.
**Example:** `frontend/src/app/layout.tsx` + `frontend/src/app/page.tsx`.
**Shape:**
```tsx
// layout.tsx
<html className="h-full">
  <body className="flex h-full flex-col overflow-hidden">{children}</body>
</html>

// page.tsx
<main className="flex h-full flex-col overflow-hidden ...">
  <header className="h-12 shrink-0 ..." />
  <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden" />
</main>
```
**Why:** prevents `min-h-screen` + header from exceeding viewport and stops resize-handle overflow from creating global scrollbars.
**Don't use when:** the page is meant to scroll as a normal document (marketing pages, long forms).

### Header icon-group separator
**Use when:** visually separating sidebar toggles from nav/action icons in the global header.
**Example:** `frontend/src/app/page.tsx` — left group (after left collapse) and right group (after dark-mode toggle).
**Shape:**
```tsx
<div className="mx-2 h-5 w-px bg-border" />
```
**Why:** matches VS Code toolbar grouping; uses theme `border` token for light/dark.
**Don't use when:** icons are already in distinct visual clusters with enough spacing.

### HeaderIconButton (icon + compact tooltip)
**Use when:** any header toolbar icon in Sage.
**Example:** `frontend/src/app/page.tsx` — `HeaderIconButton` function.
**Supports:**
- Codicon via `iconClass`
- Custom icon via `icon` prop (Tabler, composites)
- Tooltip placement: `bottom` | `left` | `right`
- Dark mode: `text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50`
**Don't use when:** the control isn't an icon button (use shadcn `Button` or a link pattern instead).

### Tabler icon in Codicon toolbar
**Use when:** Codicons doesn't have the icon you need.
**Example:** `TablerIcon` helper in `page.tsx`:
```tsx
const ICON_SIZE = 20;
const ICON_STROKE = 2.6;

<IconUpload size={ICON_SIZE} stroke={ICON_STROKE} className="text-current" />
```
Or pass through `TablerIcon` for header buttons. Chat input uses ad-hoc sizes (`IconMicrophone` 20, `IconSend` 18).
**Constants:** `ICON_SIZE = 20`, `ICON_STROKE = 2.6` — keep Tabler icons visually matched to stroked Codicons (`fontSize: ICON_SIZE` on codicons).
**Don't use when:** a Codicon exists and looks right — prefer one library per toolbar where possible.

### Full-height layout under a header
**Use when:** stacking a fixed header above a scrollable/flexible body in a panel.
**Example:** left panel in `page.tsx`:
```tsx
<section className="flex h-full min-w-0 flex-col overflow-hidden">
  <header className="h-12 shrink-0 ..." />
  <div className="min-h-0 flex-1" />
</section>
```
**Why:** `min-h-0` lets flex children shrink; `min-h-screen` on inner sections causes overflow when a header is added above.
