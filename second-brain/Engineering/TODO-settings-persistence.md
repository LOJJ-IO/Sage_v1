---
type: engineering
status: active
tags: [area/frontend, todo]
created: 2026-07-12
updated: 2026-07-12
related: ["[[UI-UX-Guidelines]]", "[[FEAT-configure-settings]]", "[[FEAT-file-upload]]"]
---

# TODO: Settings & chat config persistence

## Context
Pass A/B shipped form dialogs with Discard + Save and success toasts. **No localStorage or API persistence** yet — Save commits to in-memory draft only.

## When backend lands
- [ ] Define persistence contract: profile fields (Settings), chat config (Configure), session vs user scope
- [ ] Wire `useDialogDraft` save handlers to API
- [ ] Success toast copy after real commit; error toast + Retry on failure
- [ ] Settings content pane: show `SettingsFormSkeleton` while profile fetch (`isInitialLoading`); keep table visible on refresh

## Related
- [[FEAT-configure-settings]]
- [[FEAT-file-upload]] — file list `FileListSkeleton` when manifest API loads
