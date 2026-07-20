---
type: feature
status: in-progress
tags: [area/frontend, area/product]
created: 2026-07-10
updated: 2026-07-19
related: ["[[FEAT-app-shell-layout]]", "[[FEAT-sign-in]]", "[[UI-UX-Guidelines]]", "[[Workspace-UI-Design-Decisions]]", "[[Sage-MVP-Functional-Spec]]"]
---

# FEAT: Configure / Settings modals

## Status
`in-progress` — split modals shipped; Reset PIN flow pending.

## Problem
Staff need workspace settings (profile, account) and per-chat configuration (goal, response length) without leaving the shell. Organization admin stays on `/organization`.

## Solution
**Two modals**:

| Trigger | Modal | Size |
|---|---|---|
| Ask panel **Configure** (`codicon-settings`) | `ConfigureChatDialog` — NotebookLM-style single column | Default dialog (`max-w-md`) |
| Top-bar **Settings** icon | `SettingsDialog` — Claude-like two-pane | `max-w-3xl` |

### Configure chat
- Intro: **Customise your Assistance**
- Goal pills: Default / Learning guide / Custom — ghost → primary, no checkmark
- Length pills: Default / Shorter
- **Custom** selected → Ask-pane-style textarea (`SettingsTextArea`)
- Local state only

### Settings
- Sidebar: General, Theme, Account — no Organization
- General: display name, nickname, work description (no instructions textarea)
- Theme: Light / Dark / System (localStorage `sage_theme`; boot script in `layout.tsx`)
- Account: Reset PIN stub, Learn more link

## Out of scope (v1)
- Sidebar search, Organization in modal
- Backend persistence of theme (local only for now)

## Technical approach
- `settings-dialog.tsx`, `configure-chat-dialog.tsx`, shared `settings-fields.tsx`
- Theme: `lib/theme.ts` + root `ThemeProvider` (`useTheme`); boot script in `layout.tsx`; `:root.dark` CSS tokens in `globals.css` (after `:root`, higher specificity)
- `settingsOpen` + `configureChatOpen` in `page.tsx`
- `ProfileMenu` → `onOpenSettings`

## Related
- [[FEAT-sign-in]], [[FEAT-organization]]
