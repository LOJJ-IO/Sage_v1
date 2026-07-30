---
type: pattern
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-07-30
related: ["[[Coding-Standards]]", "[[UI-UX-Guidelines]]", "[[FEAT-app-shell-layout]]", "[[Lessons-Learned]]", "[[Stacking-Contexts-and-Portals]]"]
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
**Use when:** adding a drag handle between floating panel columns.
**Example:** `frontend/src/app/page.tsx` — invisible gutter between left/center and center/right.
**Shape:**
```tsx
// Grid track: 0.5rem (8px gutter — page well shows through)
<div className="relative h-full">
  <button
    aria-label="Resize left column"
    className="absolute left-1/2 top-0 z-10 h-full w-4 -translate-x-1/2 cursor-col-resize touch-none bg-transparent"
  />
</div>
```
**Why:** gutter is the visual separation; `w-4` hit area overflows for easier grabbing with **no** visible line or hover chrome.
**Collapsed panel:** set gutter grid track to `0px` and **don't render** the resize handle — otherwise the 16px hit area overflows and causes viewport scrollbars. See [[Lessons-Learned#2026-07-03 — Global scrollbars when collapsing side panels]].
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
<main className="flex h-full flex-col overflow-hidden bg-muted ...">
  <header className="h-12 shrink-0 ..." />
  <div className="grid min-h-0 min-w-0 flex-1 overflow-hidden p-2 pb-0" />
  <footer className="shrink-0 ..." />
</main>
```
**Why:** prevents `min-h-screen` + header from exceeding viewport and stops resize-handle overflow from creating global scrollbars.
**Don't use when:** the page is meant to scroll as a normal document (marketing pages, long forms).

### ThemeProvider (app-wide appearance)
**Use when:** any UI needs light / dark / system preference.
**Example:** `frontend/src/components/theme/theme-provider.tsx` wraps the app in `layout.tsx`; Settings → Theme calls `useTheme()`.
**Shape:**
```tsx
// layout.tsx — boot script + provider
<html suppressHydrationWarning>
  <head>{/* sage_theme boot script toggles .dark on <html> */}</head>
  <body>
    <ThemeProvider><TooltipProvider>{children}</TooltipProvider></ThemeProvider>
  </body>
</html>

// globals.css — dark tokens AFTER :root, higher specificity
:root { /* light */ }
:root.dark { /* dark — must beat :root */ }
```
**Why:** preference is shared state (not Settings-local); System listens to `prefers-color-scheme` on every route. `:root.dark` after `:root` avoids light tokens winning at equal specificity — [[Lessons-Learned#2026-07-19 — `:root` after `.dark` cancels dark mode]].
**Don't use when:** a one-off decorative color that isn't part of the design-token system.

### HeaderIconGroup (pill shell)
**Use when:** clustering related header / panel toolbar icon buttons into one control surface.
**Example:** `frontend/src/app/page.tsx` — `HeaderIconGroup` wrapping top-bar nav icons, left-panel file actions, right-panel Search/History, and single-icon Collapse toggles.
**Shape:**
```tsx
<div className="flex items-center gap-0.5 rounded-full border border-border bg-background p-0.5 shadow-sm">
  {/* HeaderIconButtons — use rounded-full on the buttons inside */}
</div>
```
**Why:** turns loose icons into one segmented control (same job as a toolbar segment). Keep primary CTAs (`New chat`) outside utility pills. Related but distinct actions in one pill (e.g. Profile + Collapse) use an inner `|` divider (`mx-0.5 h-5 w-px bg-border`); separate unrelated pills use `gap-2`.
**Don't use when:** a single standalone CTA/button that isn't part of an icon cluster.

### Header icon-group separator
**Use when:** a thin rule is still clearer than gap alone (legacy / dense toolbars). Prefer `gap-2` between `HeaderIconGroup` pills first.
**Example:** older global-header layouts in `page.tsx` history.
**Shape:**
```tsx
<div className="mx-2 h-5 w-px bg-border" />
```
**Why:** matches VS Code toolbar grouping; uses theme `border` token for light/dark.
**Don't use when:** icons are already in distinct pill clusters with enough spacing.

### HeaderIconButton (icon + compact tooltip)
**Use when:** any header toolbar icon in Sage.
**Example:** `frontend/src/app/page.tsx` — `HeaderIconButton` function.
**Supports:**
- Codicon via `iconClass`
- Custom icon via `icon` prop (Tabler, composites)
- Tooltip placement: `bottom` | `left` | `right`
- Dark mode: `text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-ring/50`
**Stacking / visibility:**
- Tooltips use shadcn/Base UI `Tooltip` with `TooltipPrimitive.Portal` → `document.body` (via `frontend/src/components/ui/tooltip.tsx`). `HeaderIconButton` wraps trigger + `TooltipContent variant="compact"` (VS Code black compact style).
- `TooltipProvider` wraps the app in `frontend/src/app/layout.tsx`.
- Portaling fixes stacking-context paint-order bugs (global header tooltips under panel headers) and overflow clipping on panel tooltips — see [[Lessons-Learned#2026-07-07 — Header tooltips hidden behind grid panels (stacking context)]] and [[Stacking-Contexts-and-Portals#Sage implementation]].
- Do **not** revert to nested `absolute` + `group-hover` tooltips inside the button — `z-50` on the span cannot escape parent stacking contexts or `overflow-hidden` panels.
**Don't use when:** the control isn't an icon button (use shadcn `Button` or a link pattern instead).

### File upload (in-memory prototype)
**Use when:** shell UI needs pick-and-list files before FastAPI exists.
**Example:** `useFileLibrary` in `page.tsx`; rules in `frontend/src/lib/file-upload.ts`.
**Shape:**
```tsx
const { files, error, openFilePicker, inputRef, inputProps } = useFileLibrary();
<input ref={inputRef} {...inputProps} />
```
**Supported (v1):** PDF, DOCX, TXT, MD, JPEG/PNG/WebP/GIF — 25 MB each. Legacy `.doc` rejected. See [[FEAT-file-upload]].
**Note:** `File` objects in React state only — lost on refresh. No API/disk until FastAPI.
**Don't use when:** persistence, extraction, or admin gating is required — need backend.

### Empty state (`EmptyState`)
**Use when:** any zero-content panel, dialog field, or list.
**Example:** `EmptyState` in `frontend/src/components/ui/empty.tsx` — owns icon disc + title + description + optional CTA. Call sites pass props only; do not compose `EmptyHeader` / `EmptyMedia` yourself.
**Panel fill:** `className="h-full px-4"`. Compact (e.g. TagInput): `className="px-3 py-5"`.
**Don't use when:** loading skeletons — those stay separate.

### Tag input (`TagInput`)
**Use when:** editing a list of keywords as chips inside one focusable field (Edit tags).
**Example:** `frontend/src/components/ui/tag-input.tsx` — chip row (wraps, no scrollbar) + draft caret in one flex flow (`min-w-[3ch] basis-[3ch] flex-1` so leftover row space is filled before wrap); library suggestions via a **portaled** list (`createPortal` → `document.body`, `z-100`, anchored under the **draft caret**, `min-w-[8.415rem]` / `max-w-xs`). Open on focus when unused library tags exist; filter/rank as you type (prefix then substring). Empty field shows placeholder “Add a tag”; Save disabled when 0 tags. Commit on **Enter**; draft is not a chip until committed. Click chip label to rename; × removes.
**Don't use when:** freeform comma string is enough — rare. Prefer portal over Base UI `Popover` here — trigger/focus fight + dialog stacking made anchored popovers flaky.

### Dialog shell (`ShellDialog` + `--dialog-shell-*` tokens)
**Use when:** any modal that should match Settings chrome — bordered header, scroll body, bordered footer.
**Tokens** (`globals.css` `:root`): `--dialog-shell-px`, `--dialog-shell-header-py`, `--dialog-shell-footer-py`, `--dialog-shell-body-py`, `--dialog-shell-max-h`, `--dialog-shell-min-h`. Exposed to Tailwind as `px-dialog-shell-x`, `py-dialog-shell-header-y`, etc.
**Primitive:** `ShellDialog` in `frontend/src/components/ui/shell-dialog.tsx` — custom `footer` slot; optional `onSubmit` wraps in `<form>`; optional `headerExtra` (e.g. wizard progress).
**Recipes on top:**
- `FormDialog` — Discard + Save (`ConfigureChatDialog`, `SettingsDialog`)
- `ConfirmDialog` — Cancel + confirm (`DeleteFileDialog`)
- Wizards — custom Back/Next footer (`AddAccountDialog`)
**Don't use when:** one-off legacy padded popup — rare; prefer shell for new work.

### Form dialog shell (`FormDialog`)
**Use when:** any editable modal with Discard + Save.
**Example:** `FormDialog` in `frontend/src/components/ui/form-dialog.tsx`; `ConfigureChatDialog`, `SettingsDialog`.
**Shape:**
```tsx
<FormDialog
  open={open}
  onOpenChange={setOpen}
  title="…"
  description="…"
  size="sm" | "lg"
  onDiscard={resetDraft}
  onSave={handleSave}
  isSaving={isSaving}
>
  {children}
</FormDialog>
```
**Draft:** `useDialogDraft` + `useDialogOpenSync` — snapshot on open, Discard/X reverts, Save commits.
**Don't use when:** destructive confirm only — use `ConfirmDialog`; multi-step with custom footer — use `ShellDialog` directly.

### Confirm dialog shell (`kind="confirm"`)
**Use when:** irreversible or high-stakes action with no user draft.
**Example:** `ConfirmDialog` in `frontend/src/components/ui/confirm-dialog.tsx`; `DeleteFileDialog`.
**Footer:** Cancel (autoFocus, safe) + destructive `{Verb}`.
**Don't use when:** user edited fields — use `FormDialog`.

### SegmentedControl
**Use when:** mutually exclusive pill options in a form.
**Example:** `frontend/src/components/ui/segmented-control.tsx` — Configure chat goal/length.
**2 options:** single pill shell + inner divider (like Organization | Settings). **3+:** wrap row of outline/default buttons.

### Toast notifications
**Use when:** post-commit feedback (Save succeeded), background info, or sticky errors.
**Example:** `ToastProvider` portals a fixed host to `document.body` (`top-14 right-4`, `z-[100]` above dialog `z-50`); `useToast()` from any route.
**Don't use when:** in-form validation — use inline errors; destructive confirms — use `ConfirmDialog`.
**Don't nest toast hosts inside panel columns** — collapsible/`overflow-hidden` grids clip them, and local `z-index` loses to body-portaled dialogs.

### Skeleton pairs
**Use when:** a data boundary has no initial data yet.
**Example:** `AccountsTableSkeleton` when `accounts === undefined` in `OrganizationView`; `FileListSkeleton` when `files === undefined` (future API).
**Rule:** branch on **data availability** (`undefined` = not ready), not `isLoading` flags tied to fetch start/end. Use `isRefreshing` only when cached data exists. Skeleton components never fetch.
**Don't put fetch logic inside skeleton components.**

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
