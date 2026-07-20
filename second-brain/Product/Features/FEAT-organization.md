---
type: feature
status: in-progress
tags: [area/frontend, area/product, priority/high]
created: 2026-07-08
updated: 2026-07-19
related: ["[[Sage-MVP-Functional-Spec#3.4.3 Admins creating additional accounts]]", "[[Sage-MVP-Functional-Spec#3.4.7 UI shape, concretely]]", "[[0004-username-pin-modular-auth]]", "[[API-Documentation#Accounts (Admin)]]", "[[FEAT-sage-mvp]]", "[[FEAT-sign-in]]", "[[UI-UX-Guidelines]]"]
---

# FEAT: Organization (accounts)

## Status
`in-progress` — UI at `/organization` implemented; backend wiring pending

## Problem
Store admins need to create staff accounts, reset forgotten PINs, and deactivate/reactivate access without a separate admin login or public sign-up flow.

## Solution
Admin-only **Organization** page at **`/organization`** (spec historically called this "Manage Accounts" under gear settings):

**List view** — table on desktop, cards on mobile:
- Username
- Role badges (Admin / Staff, plus Primary and Inactive when applicable)
- Created date
- Kebab menu per row

**Kebab actions:**
- Reset PIN — opens modal to set a new temporary 4-digit PIN
- Deactivate — disabled for primary admin; confirmation dialog
- Reactivate — shown for inactive accounts
- Grant / revoke admin privileges — confirmation dialogs

**+ Add account** (top-right):
- Name + username
- Temporary PIN (4 digits)
- Grant admin privileges toggle (off by default)
- Confirm your PIN — only when admin toggle is on ([[Sage-MVP-Functional-Spec#3.4.4]])

Spec authority: [[Sage-MVP-Functional-Spec#3.4.3]]–[[Sage-MVP-Functional-Spec#3.4.7]].

## Out of scope (this feature)
- Admin-only route guard / middleware
- Unlock locked accounts UI beyond reset PIN

## UI/UX
- Route: `frontend/src/app/organization/`
- Components: `OrganizationView`, `AccountsTable`, `AddAccountDialog`, `ResetPinDialog`, `AdminPrivilegesDialog`, `AccountRowMenu`
- Entry: admin-only header button (`codicon-organization`) next to Profile
- Demo mode when `NEXT_PUBLIC_API_URL` unset — in-memory `DEMO_ACCOUNTS` in `lib/accounts/api.ts` (starts **empty**; local create/mutate still works). Empty state: "No accounts yet"
- Page well uses `bg-muted` (theme-aware) — see [[UI-UX-Guidelines]]
- In-app label spelling: **Organization** (US)

## Technical approach
- API client: `frontend/src/lib/accounts/api.ts` → `GET/POST /accounts`, reset-pin, deactivate, reactivate, grant/revoke admin
- JWT via `Authorization` header from `sessionStorage` ([[API-Documentation#Accounts (Admin)]])
- Shared `frontend/src/lib/api/client.ts` for authenticated fetch

## Open questions
- Spec still says "Manage Accounts" in places — product label is now **Organization** / `/organization`

## Related
- Primary admin protection: [[Sage-MVP-Functional-Spec#3.4.5]]
- Sign-in: [[FEAT-sign-in]]
