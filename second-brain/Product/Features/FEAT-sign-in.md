---
type: feature
status: in-progress
tags: [area/frontend, area/product, priority/high]
created: 2026-07-07
updated: 2026-08-02
related: ["[[Sage-MVP-Functional-Spec#3.4.1 Regular sign-in]]", "[[0004-username-pin-modular-auth]]", "[[UI-UX-Guidelines]]", "[[FEAT-sage-mvp]]", "[[API-Documentation#Auth]]"]
---

# FEAT: Sign-in page

## Status
`in-progress` — UI at `/sign-in` implemented; client route gate on `/` redirects unsigned users to `/sign-in`; backend wiring may still use demo stub when `NEXT_PUBLIC_API_URL` is unset

## Problem
Retail staff and managers share store tablets and need a fast, touch-friendly way to authenticate with username + PIN — no email, no separate admin login, no public sign-up.

## Solution
Single sign-in screen at **`/sign-in`** for all roles:
- Centered **light card** on neutral background (tablet-friendly)
- Username text field **above** the keypad
- **Passcode** entry via Apple-style circular numeric keypad (4 digits, letter sublabels, open-circle indicators)
- **Auto-submit** when the 4th digit is entered (no Sign in button)
- `lock.webm` above the title: wrong passcode plays **0 → 1s**; correct plays **1s → end**, then navigates to `/` (or `/change-pin` when `must_change_pin`)
- Footer copy: "Don't have an account? Ask your manager."
- Error states for invalid credentials, locked account, deactivated account, service unavailable
- On success: store JWT in `sessionStorage`, enter workspace

API field remains `pin`; UI label is **Passcode**.

Spec authority: [[Sage-MVP-Functional-Spec#3.4.1 Regular sign-in]], [[Sage-MVP-Functional-Spec#3.4.7 UI shape, concretely]].

## Local demo (no API)
When `NEXT_PUBLIC_API_URL` is unset, `login()` accepts:
- Username: `sage`
- Passcode: `1234`
→ admin session, redirect to `/` after full lock video.

## Auth gate (shipped 2026-08-02)
- `RequireAuth` wraps the workspace at `/` (`frontend/src/components/auth/require-auth.tsx`)
- Checks `getAuthToken()` from `sessionStorage`; missing token → `router.replace("/sign-in")`; children mount only after check (avoids shell flash + premature API calls)
- Signed-in users hitting `/sign-in` are sent to `/`
- Why client-only: JWT is in `sessionStorage`, so Next `middleware.ts` cannot read it. Cookie-backed sessions would unlock edge middleware later

## Out of scope (this feature)
- Change-PIN flow (`/change-pin`) — separate feature; sign-in redirects there when API returns `must_change_pin`
- Organization UI
- Server/middleware route protection (needs cookie session redesign)
- Session inactivity timeout (30 min) — session layer, not sign-in page

## UI/UX
- Route: `frontend/src/app/sign-in/`
- Components: `SignInForm`, `PinKeypad`; shadcn `Input`, `Label`
- Keypad: circular `size-16` muted buttons, digit + optional letter sublabels (ABC…), delete key, centered `0`
- Asset: `lock-fail.webm` (0→**0.7s**) + `lock-success.webm` (**0.7s→2.7s**); split with `ffmpeg -c copy` to preserve VP8 alpha
- Header: lock video (muted, `playsInline`) replaces static login icon

## Technical approach
- Client form calls `POST /auth/login` via `frontend/src/lib/auth/login.ts` when `NEXT_PUBLIC_API_URL` is set; otherwise demo stub
- Auth types in `frontend/src/lib/auth/types.ts` — modular boundary ahead of backend [[0004-username-pin-modular-auth]]
- Token stored in `sessionStorage` (`sage_access_token`) until session/auth layer is built
- Fail clip: start at 0, pause at 1s; success: start at 1s, wait for `ended` then `router.push`

## Open questions
- None for sign-in UI; `/change-pin` page is next auth screen

## Related
- [[API-Documentation#POST /auth/login]]
- [[Sage-MVP-Functional-Spec#12.8 Username vs. PIN security model]]
