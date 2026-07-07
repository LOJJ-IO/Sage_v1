---
type: bug
status: open
tags: [area/frontend, area/design]
created: 2026-07-03
updated: 2026-07-07
related: ["[[Current-Context]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]"]
---

# BUG-0001: Frontend UI inconsistencies (prototype debt)

## Status
`open`

## Symptom
The app shell looks and behaves inconsistently across toolbars, panels, and docs. Individual pieces work, but patterns don't align — icons vary in weight, buttons use three different implementations, vault docs don't match code, and placeholder UI isn't wired up.

## Environment
Local dev — `frontend/src/app/page.tsx`, shadcn `Button`/`Empty`, Tailwind v4 + Turbopack.

## Root cause
Rapid additive UI work in a single file without a consolidated design-system pass after shadcn was added. Codicons + Tabler + shadcn coexist without shared constants or a single button primitive. Vault docs were updated incrementally and drifted from code.

## Items

### Icon weight / library mixing
- **Header Tabler** (`TablerIcon`): `ICON_SIZE = 20`, `ICON_STROKE = 2.6` — real SVG stroke.
- **Header Codicons** (`HeaderIconButton` + `iconClass`): font glyph + `[-webkit-text-stroke:0.35px_currentColor]`.
- **Result:** Upload (Tabler) reads bolder than Fold/Unfold (Codicon) in adjacent toolbar contexts.
- **Also:** Empty-state icons (`stroke={2}`), chat icons (`stroke={2}`, send `size={18}`), and empty-state `IconUpload` (no props → Tabler defaults) skip `TablerIcon`.

### Button pattern fragmentation
| Location | Implementation |
|---|---|
| Empty state "Upload files" | shadcn `Button` |
| Global + panel headers | `HeaderIconButton` — portaled shadcn `Tooltip` (`variant="compact"`) |
| Chat voice / send | raw `<button>` + hand-rolled classes |
| Resize handles | raw `<button>` |

No shared focus, hover, size, or dark-mode contract across these.

### Panel layout vs documentation
- **Code:** center panel is an empty `<section>`; `AskAiEmptyState` lives in the **right** panel; `FilesEmptyState` in the **left** panel.
- **Docs:** [[FEAT-app-shell-layout]] previously claimed `AskAiEmptyState` in the **center** — incorrect.

### Vault / spec drift ([[FEAT-app-shell-layout]])
| Doc says | Code has |
|---|---|
| Sort → `IconFilter2Up` | `IconArrowsSort` |
| Auto sort → `IconFilter2Spark` | `IconWand` |
| Auto-reveal → file+pin composite | `IconEyeQuestion` |
| Upload → `IconFileUpload` | `IconUpload` |

### Styling system split
- shadcn components and shell chrome both use CSS variables from `globals.css` (`--primary`, `--muted`, `--sidebar`, etc.) as of 2026-07-03.
- VS Code compact tooltips remain hardcoded black — intentional.

### Dark mode incomplete
- `isDark` toggles `dark` on `<html>` only.
- No persistence, no system preference sync.

### Non-functional placeholder UI
- "Upload files" `Button` — no `onClick`.
- Chat voice / send — no handlers; message state goes nowhere.

### Config / metadata leftovers
- `components.json` → `iconLibrary: "lucide"` but app uses Tabler + Codicons.
- `layout.tsx` metadata still Next.js scaffold defaults.

### Dev tooling (shadcn CSS imports)
- `@import "tw-animate-css"` may not resolve under Turbopack until `.next` cleared or explicit path used — package must be installed in `frontend/node_modules`.

## Fix
Not started. Suggested order when prioritizing:
1. Unify icon constants + one `TablerIcon` path everywhere; tune stroke to match Codicons (~2–2.2).
2. Decide button strategy: extend shadcn `Button` vs formalize `HeaderIconButton` as app primitive.
3. Correct [[FEAT-app-shell-layout]] + decide center panel placeholder (editor empty state?).
4. Migrate hardcoded `neutral-*` in shell chrome to design tokens where practical.
5. Dark mode persistence + optional system preference.

## Prevention
- Add icon/button conventions to [[UI-UX-Guidelines]] once unified.
- When changing panel content, update [[FEAT-app-shell-layout]] in the same PR.
- Lint or review rule: new toolbar icons must use `TablerIcon` or Codicon path, not ad-hoc Tabler props.

## Related
- [[Current-Context#Known bugs / inconsistencies]]
- [[UI-UX-Guidelines]]
- [[FEAT-app-shell-layout]]
- Canonical code: `frontend/src/app/page.tsx`
