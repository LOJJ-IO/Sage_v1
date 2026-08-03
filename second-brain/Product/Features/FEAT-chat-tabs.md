---
type: feature
status: in-progress
tags: [area/frontend, area/product]
created: 2026-08-02
updated: 2026-08-02
related: ["[[FEAT-sage-mvp]]", "[[FEAT-preview-tabs]]"]
---

# FEAT: Chat tabs + auto-titling

## Status
`in-progress` — multiple concurrent chat tabs in the right panel implemented; auto-generated titles implemented; no persistence (in-memory only, matches prior single-chat behavior).

## Problem
The right-panel "Ask AI" chat previously held exactly one conversation. "New chat" reset it in place — starting a second line of questioning destroyed the first one, with no way to get back to it. Chat titles were also always the static placeholder "Title," manually editable but never set automatically.

## Solution
- `frontend/src/hooks/use-chat-sessions.ts` replaces the single `messages`/`chatTitle` state in `page.tsx` with an array of `ChatSession` (`frontend/src/lib/chat/types.ts`): `{ id, title, titleIsCustom, messages }`.
- "New chat" (`codicon-add` button, chat panel header) now calls `newChat()` — appends a new session and switches to it, rather than clearing the active one.
- `frontend/src/components/chat/chat-tab-strip.tsx` — a small pill-style tab row (title + close ×) above the existing chat header, shown only once 2+ tabs are open (single-chat case looks unchanged). Not built on the `preview-tabs` machinery (pinning/lane-compression/resource-sync) — that subsystem is file-editor-shaped and overkill here; this is a deliberately minimal, separate implementation.
- Auto-title: `frontend/src/lib/chat/title.ts::deriveChatTitle` — pure client-side heuristic (trim, collapse whitespace, capitalize, truncate ~48 chars), no LLM call. Fires once, when the first user message lands in a session, only if the title hasn't been manually edited (`titleIsCustom`, set by typing in the title `<input>`).
- An in-flight `/ask` reply always lands in the session that asked it, even if the user has switched to a different tab meanwhile (correct by construction — `sendMessage`'s closure captures `activeSessionId` at send time, not read again on response).
- Closing the last remaining tab replaces it with a fresh empty one rather than leaving zero tabs.

## Out of scope
- Persistence across reload — sessions are in-memory only, same as the single-chat version before this. Revisit if users ask for it.
- LLM-generated titles — explicitly deferred; the ask was for something simple.
- Reordering/dragging tabs, pinning.

## UI/UX
- Tab strip sits between the chat panel's rounded top corner and the existing title-input/icon-button header row.
- No `+` button inside the tab strip itself — the existing header "New chat" icon button is the only entry point, to avoid two redundant controls.

## Technical approach
- `frontend/src/hooks/use-chat-sessions.ts` owns all session state + the existing `/ask` call (moved from `page.tsx`'s old `handleSendMessage`) and the local-demo-reply fallback (`isBackendConfigured()` false).
- `closeChat` computes the fallback active tab synchronously (not via a reconciliation `useEffect`) — deliberate choice to avoid this codebase's existing (tolerated but not repeated-by-choice) `setState`-in-`useEffect` pattern seen elsewhere (`organization-view.tsx`, `toast-provider.tsx`).

## Open questions
- None currently — flag if multi-tab chat needs to survive a refresh later.

## Related
- [[FEAT-preview-tabs]] — the center-panel tab system this deliberately does NOT reuse (different shape of problem: file resource lifecycle vs. ephemeral chat sessions).
