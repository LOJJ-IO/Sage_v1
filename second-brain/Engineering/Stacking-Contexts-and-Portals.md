---
type: reference
status: active
tags: [area/frontend, css, react]
created: 2026-07-07
updated: 2026-07-07
related: ["[[Lessons-Learned]]", "[[Reusable-Patterns]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]"]
---

# Stacking Contexts and Portals

Reference for paint order, stacking contexts, and why header tooltips disappear behind panels — plus how React portals fix it.

Once paint order and stacking contexts click, `z-index` almost becomes boring.

## Paint order (first principles)

Browsers have **one canvas**. They don't erase — they **paint over** previous pixels. Paint order is simply **the order things are drawn**. If two things occupy the same pixel, whoever is painted **last** wins.

```
Stroke 1: Background
Stroke 2: Header      (covers background where they overlap)
Stroke 3: Sidebar     (covers header/background where they overlap)
Stroke 4: Tooltip     (covers whatever is underneath)
```

Think Photoshop layers: later layers appear on top. **This has nothing to do with z-index yet.**

### DOM order

Without CSS, paint order usually follows DOM order:

```html
<div>A</div>
<div>B</div>
```

If A and B overlap, **B wins** — painted second.

```html
<header></header>
<main></main>
<footer></footer>
```

→ paint header, then main, then footer.

### When paint order alone breaks down

Header contains a tooltip that hangs below into `<main>`:

```
HEADER
  Upload
  Tooltip  ← overlaps main
──────────────
MAIN
  Panel
```

DOM order says main is painted after header, so **main covers the tooltip** — even before z-index enters the picture. We need more rules.

### z-index (within a context)

`z-index` tells the browser: *within this area, paint this element after other things here.* It does **not** automatically compare across unrelated parts of the tree.

## Stacking contexts

A stacking context is a **building where z-index values are compared** — not the whole page.

**Apartment analogy:** Floor 50 in Building A vs Floor 1 in Building B — you can't compare floor numbers across buildings. If Building B sits on a hill (higher stacking context), Building B Floor 1 is still above Building A Floor 50.

Beginners assume `z=9999` always beats `z=1`. **No** — only among elements in the **same** stacking context.

```html
<header>  <!-- Header Context -->
  <Tooltip style="z-index:999" />
</header>
<main>    <!-- Main Context -->
  <Panel />
</main>
```

Browser compares **Header Context vs Main Context**, not Tooltip 999 vs Panel 1. Whichever context wins, everything inside it wins.

### Recursive / atomic painting

Browser doesn't interleave children across contexts. Conceptually:

```
Paint Header Context → Button, Tooltip → HEADER.PNG (one atomic picture)
Paint Main Context   → Panel          → MAIN.PNG
```

If MAIN.PNG is laid on top, it covers HEADER.PNG entirely — tooltip is **baked into** the header picture.

**Photo model:** each stacking context is a photograph laid on a table; you can't pull one drawing out of a photo without moving the whole photo or cutting that element into its own photo (portal).

**Paper-sheet model:** same idea — tooltip is ink on Sheet A; Sheet B on top hides everything on Sheet A regardless of ink z-index. See [[#Fix: lift the whole sheet]].

### Debug checklist

When something renders behind something else:

1. **What is painted first?** (paint order / DOM order)
2. **Which stacking context does each element belong to?** (which "photo"?)
3. **Am I comparing z-index across different contexts?** (if yes, that's the bug)

## The beginner mental model (wrong)

```
Page
├── Header
│   └── Tooltip (z=999)
└── Panel (z=1)
```

Assumption: tooltip `z-index: 9999` always wins over the panel.

**Reality:** the browser compares **stacking contexts** (layers / photos), not individual elements globally.

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

Now Header Layer sits above Panel Layer. Everything on the header — including tooltips — comes along. You're moving the whole photo, not just one drawing on it.

In Sage shell: ~~add `relative z-20` to the global `<header>`~~ **Done (2026-07-07):** portaled tooltips via [[Stacking-Contexts-and-Portals#Sage implementation]] — preferred over lifting the header layer.

## Fix: cut the tooltip out (portal)

A React portal renders DOM elsewhere while keeping logical ownership in the component tree. The tooltip escapes `HEADER.PNG` and becomes its own layer.

**Before (DOM):**

```
<body>
  <header>          ← HEADER.PNG
    <Upload />
    <Tooltip />     ← baked into header picture
  </header>
  <Panel />         ← MAIN.PNG
</body>
```

**After portal to `document.body`:**

```
<body>
  <header>          ← HEADER.PNG
    <Upload />
  </header>
  <Panel />         ← MAIN.PNG
  <Tooltip />       ← TOOLTIP.PNG — painted independently
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

### Sage implementation

**Status:** shipped 2026-07-07.

| Piece | Location |
|---|---|
| Tooltip primitive | `frontend/src/components/ui/tooltip.tsx` — shadcn/Base UI, `TooltipPrimitive.Portal` |
| App provider | `frontend/src/app/layout.tsx` — `<TooltipProvider>` wraps `{children}` |
| Shell usage | `HeaderIconButton` in `frontend/src/app/page.tsx` — `Tooltip` + `TooltipTrigger` + `TooltipContent variant="compact"` |

**Why portal over `z-20` on header:** Lifting the global header layer fixes paint-order for header tooltips but does not fix panel-header tooltips clipped by `overflow-hidden`. Portaling fixes both mechanisms with one pattern.

**Compact variant:** Sage toolbars keep VS Code–style black tooltips (`bg-black`, `text-[12px]`, `px-2.5 py-1.5`) via `variant="compact"` on `TooltipContent` — not the default shadcn `bg-foreground` popover style.

**Rule going forward:** Any new shell tooltip (global header, panel headers, future toolbars) should use the portaled `Tooltip` component, not nested absolute spans.

## Don't confuse with overflow clipping

A **different** bug: panel sections use `overflow-hidden`, which clips absolutely positioned tooltips inside the panel — even with high z-index. See [[Lessons-Learned#2026-07-03 — Panel tooltips clipped at minimum resize width]].

| Mechanism | Symptom | Fix |
|---|---|---|
| Paint order / DOM order | Later sibling covers earlier overlap | Reorder DOM, or raise stacking context / portal |
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
