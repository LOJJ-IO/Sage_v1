---
type: feature
status: in-progress
tags: [area/frontend, area/product, priority/high]
created: 2026-07-07
updated: 2026-07-08
related: ["[[Sage-MVP-Functional-Spec#3.4.1 Regular sign-in]]", "[[0004-username-pin-modular-auth]]", "[[UI-UX-Guidelines]]", "[[FEAT-sage-mvp]]", "[[API-Documentation#Auth]]"]
---

# FEAT: Sign-in page

## Status
`in-progress` — UI at `/sign-in` implemented; backend wiring pending

## Problem
Retail staff and managers share store tablets and need a fast, touch-friendly way to authenticate with username + PIN — no email, no separate admin login, no public sign-up.

## Solution
Single sign-in screen at **`/sign-in`** for all roles:
- Centered card on neutral background (tablet-friendly, scrollable on small portrait viewports)
- Username text field
- PIN entry via on-screen numeric keypad (4 digits), masked dot display
- Full-width **Sign in** button
- Footer copy: "Don't have an account? Ask your manager." (no sign-up link)
- Error states for invalid credentials, locked account, deactivated account, service unavailable
- On success: store JWT in `sessionStorage`, redirect to `/` (or `/change-pin` when `must_change_pin`)

Spec authority: [[Sage-MVP-Functional-Spec#3.4.1 Regular sign-in]], [[Sage-MVP-Functional-Spec#3.4.7 UI shape, concretely]].

## Out of scope (this feature)
- Change-PIN flow (`/change-pin`) — separate feature; sign-in redirects there when API returns `must_change_pin`
- Organization UI
- Route guards / middleware protecting `/`
- Session inactivity timeout (30 min) — session layer, not sign-in page

## UI/UX
- Route: `frontend/src/app/sign-in/`
- Components: `SignInForm`, `PinKeypad`; shadcn `Input`, `Label`, `Button`
- Keypad buttons: `h-12` (48px) touch targets per [[Sage-MVP-Functional-Spec#12.5 Screen size]]
- Palette: card on `bg-neutral-100` / `dark:bg-neutral-950`; matches [[UI-UX-Guidelines]]
- Header icon: Tabler `IconLogin2` in muted icon box

## Technical approach
- Client form calls `POST /auth/login` via `frontend/src/lib/auth/login.ts` when `NEXT_PUBLIC_API_URL` is set
- Auth types in `frontend/src/lib/auth/types.ts` — modular boundary ahead of backend [[0004-username-pin-modular-auth]]
- Token stored in `sessionStorage` (`sage_access_token`) until session/auth layer is built

## Open questions
- None for sign-in UI; `/change-pin` page is next auth screen

## Related
- [[API-Documentation#POST /auth/login]]
- [[Sage-MVP-Functional-Spec#12.8 Username vs. PIN security model]]
