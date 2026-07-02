---
type: pattern
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-06-30
related: ["[[Coding-Standards]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]"]
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
**Don't use when:** putting `w-4` directly as the grid track width — hit area won't work correctly.

### HeaderIconButton (icon + compact tooltip)
**Use when:** any header toolbar icon in Sage.
**Example:** `frontend/src/app/page.tsx` — `HeaderIconButton` function.
**Supports:**
- Codicon via `iconClass`
- Custom icon via `icon` prop (Tabler, composites)
- Tooltip placement: `bottom` | `left` | `right`
**Don't use when:** the control isn't an icon button (use a proper button/link component pattern instead, TBD).

### Tabler icon in Codicon toolbar
**Use when:** Codicons doesn't have the icon you need.
**Example:**
```tsx
<IconFileUpload size={17} stroke={2.2} className="text-current" />
```
Or wrap with `TablerIcon` helper in `page.tsx`.
**Constants:** `TABLER_ICON_SIZE = 17`, `TABLER_ICON_STROKE = 2.2` — keep Tabler icons visually matched to stroked Codicons.
**Don't use when:** a Codicon exists and looks right — prefer one library per toolbar where possible.

### Composite icon (file + pin)
**Use when:** auto-reveal / pinned file affordance.
**Example:** `FilePinIcon` in `page.tsx` — `IconFile` + `IconPin` at `absolute -bottom-0.5 -right-0.5`, pin `size={9}`.

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
