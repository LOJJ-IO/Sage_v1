---
type: lessons
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-07-03
related: ["[[Engineering/Bugs]]", "[[Troubleshooting]]", "[[UI-UX-Guidelines]]"]
---

# Lessons Learned

Append-only log of non-obvious gotchas.

## Format
```
### YYYY-MM-DD — short title
What happened / what was surprising.
Why it happened.
What to do differently.
```

## Entries

### 2026-06-30 — Resize hit area vs 2px grid track
Putting `w-4` on a button inside a `0.125rem` grid column doesn't create a usable drag target — the column constrains layout width even if the button visually overflows.
**Fix:** keep grid track at 2px; absolutely position the `w-4` button centered over the track (`left-1/2 -translate-x-1/2`). See [[Reusable-Patterns#Resizable panel divider]].

### 2026-06-30 — Invalid Tailwind width class `w-3.3`
`w-3.3` is not a valid Tailwind class — resize hit area silently didn't apply.
**Fix:** use standard scale classes (`w-3`, `w-4`).

### 2026-06-30 — `min-h-screen` on columns below a header
Adding a top header + column sections with `min-h-screen` makes total height `header + 100vh`, causing unwanted page scroll.
**Fix:** outer shell owns `min-h-screen flex-col`; panel row gets `flex-1 min-h-0`; inner sections use `h-full` / `flex-1`, not `min-h-screen`.

### 2026-06-30 — Mixing px and % panel widths
Collapsing a panel to a fixed pixel width while computing middle width as `100 - left% - right%` breaks when units mix.
**Fix:** use CSS Grid with `1fr` for middle, or track visibility separately (`0px` when hidden, saved `%` when shown). See [[FEAT-app-shell-layout#Toggle behavior (visibility vs width)]].

### 2026-06-30 — Tooltip sizing drift
First tooltip implementation used `text-sm` + heavy padding — looked nothing like VS Code compact tooltips.
**Fix:** `text-[12px]`, `px-2.5 py-1.5`, `leading-none`, `shadow-md`. Sidebar toggles use side placement, not bottom. See [[UI-UX-Guidelines#Tooltips]].

### 2026-06-30 — One file is fine early; extract on boundaries
It's normal for `page.tsx` to hold the whole shell while exploring UI. Additive programming ≠ never split files — it means don't bake in rigid assumptions before you know the shape.
**Extract when:** responsibilities stabilize (header, resize hook, panel layout), not at an arbitrary line count. See [[Current-Context#Code organization philosophy]].

### 2026-07-03 — Global scrollbars when collapsing side panels
Collapsing the right panel caused viewport scrollbars (horizontal + vertical).
**Why:** (1) `min-h-screen` + header can exceed viewport if body margin isn't reset; (2) the 16px resize hit area (`w-4`) on a 2px grid track overflows past the grid edge when the adjacent panel column is `0px`.
**Fix:** lock shell to viewport (`html`/`body`/`main`: `h-full overflow-hidden`, `body { margin: 0 }`); hide resize divider columns (`0px` track + no handle) when their panel is collapsed; restore via header toggle. See [[Reusable-Patterns#Viewport-locked app shell]] and [[Reusable-Patterns#Resizable panel divider]].

### 2026-07-03 — Panel tooltips clipped at minimum resize width
At `MIN_SIDE_WIDTH = 12%`, long bottom tooltips (e.g. "Auto-reveal current file" on the left panel header) were cut off when the panel was dragged narrow.
**Why:** Panel sections use `overflow-hidden`; tooltips are `absolute` inside the panel, not portaled. Extra `z-index` does not escape overflow clipping.
**Fix:** raised `MIN_SIDE_WIDTH` to **14%** in `page.tsx`. Alternative later: `overflow-visible` on panel header only, side-placed tooltips, or portal tooltips to `document.body`.
