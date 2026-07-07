---
type: reference
status: active
tags: [area/frontend, css, react]
created: 2026-07-07
updated: 2026-07-07
related: ["[[Lessons-Learned]]", "[[Reusable-Patterns]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]"]
---

# Stacking Contexts and Portals

Reference for why header tooltips can disappear behind panels, and how React portals fix it.

## The beginner mental model (wrong)

```
Page
├── Header
│   └── Tooltip (z=999)
└── Panel (z=1)
```

Assumption: tooltip `z-index: 9999` always wins over the panel.

**Reality:** the browser compares **layers** (stacking contexts), not individual elements globally.

## The correct mental model

```
Page
├── Header Layer (z=20)
│   ├── Header
│   └── Tooltip (z=50)   ← only competes inside Header Layer
└── Panel Layer (z=0)
    └── Panel
```

Ask **which layer is above the other?** Only then worry about z-index *within* each layer.

## Paper-sheet analogy

Two transparent sheets of paper:

**Sheet A (Header)** — Upload button + tooltip drawn on it.
**Sheet B (Panel)** — Sort, New Folder, etc.

If Sheet B lies on top of Sheet A, **everything** on Sheet A is hidden — including a tooltip with `z-index: 9999`. The tooltip is ink on Sheet A; it cannot jump off the sheet.

`z-index` on the tooltip only answers: *"Among drawings on this same sheet, who goes on top?"*

It does **not** say: *"Teleport me above every other sheet."*

### Quiz

```html
<header>
  <Tooltip z-index="9999" />
</header>
<main>...</main>
```

If the header layer is underneath `<main>`, the tooltip is:

1. Visible above `<main>` because z-index is 9999
2. **Still hidden** behind `<main>` because the entire header layer is underneath ← correct

## Fix: lift the whole sheet

Give the header a higher stacking context:

```css
header {
  position: relative;
  z-index: 20;
}
```

Now Header Layer sits above Panel Layer. Everything on the header — including tooltips — comes along.

In Sage shell: add `relative z-20` to the global `<header>` in `page.tsx` when bottom-placed tooltips extend into the panel grid. See [[Lessons-Learned#2026-07-07 — Header tooltips hidden behind grid panels (stacking context)]].

## Fix: cut the tooltip out (portal)

A React portal renders DOM elsewhere while keeping logical ownership in the component tree.

**Before (DOM):**

```
<body>
  <header>
    <Upload />
    <Tooltip />   ← child of header; trapped on Header Paper
  </header>
  <Panel />
</body>
```

**After portal to `document.body`:**

```
<body>
  <header>
    <Upload />
  </header>
  <Panel />
  <Tooltip />     ← sibling; its own layer, can float above everything
</body>
```

JSX can still read:

```tsx
<UploadButton>
  <Tooltip />   {/* logically owned by UploadButton */}
</UploadButton>
```

React separates **who owns the behavior** from **where it is rendered**.

### When to portal

Almost always for UI that must escape its container:

- Tooltips
- Dropdown menus
- Modals
- Context menus
- Command palettes
- Date pickers / popovers

Radix UI, Headless UI, Material UI, etc. render these through portals by default.

## Don't confuse with overflow clipping

A **different** bug: panel sections use `overflow-hidden`, which clips absolutely positioned tooltips inside the panel — even with high z-index. See [[Lessons-Learned#2026-07-03 — Panel tooltips clipped at minimum resize width]].

| Mechanism | Symptom | Fix |
|---|---|---|
| Stacking context | Tooltip behind sibling layer (e.g. grid below header) | Raise parent layer (`z-20` on header) or portal |
| Overflow clipping | Tooltip cut off at panel edge | Wider min width, `overflow-visible` on header row, side placement, or portal |

## React Hooks (related learning)

### What is a Hook?

A Hook is any React function whose name starts with `use`. Examples: `useState`, `useEffect`, `useRef`, `useMemo`, or custom hooks like `useAuth`.

```tsx
const [isFolded, setIsFolded] = useState(false);
//     ↑ value    ↑ setter      ↑ Hook call (initial: false)
```

`useState` is the Hook — not the entire line.

### Functional state updater

Toggle pattern:

```tsx
onClick={() => setIsFolded((folded) => !folded)}
```

Breakdown:

1. `onClick={() => ...}` — run on click
2. `setIsFolded(...)` — request a state update
3. `(folded) => !folded` — React passes **current** state; return **next** state
4. `!folded` — logical NOT; flips `true` ↔ `false`

`(folded)` is just a parameter name — `(current)`, `(value)`, `(x)` are equivalent.

**Why not `setIsFolded(!isFolded)`?** Often works, but the functional form always receives the latest committed state. Prefer it when next state depends on previous state (React may batch updates).

Same pattern in shell today:

```tsx
onClick={() => setIsLeftVisible((visible) => !visible)}
onClick={() => setIsDark((dark) => !dark)}
```

You never mutate `isFolded` directly — you give React an instruction; React updates and re-renders.
