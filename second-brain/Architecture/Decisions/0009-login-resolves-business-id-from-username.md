---
type: decision
status: active
tags: [area/backend, area/frontend]
created: 2026-07-19
updated: 2026-07-19
related: ["[[0004-username-pin-modular-auth]]", "[[Sage-MVP-Functional-Spec]]", "[[FEAT-sign-in]]", "[[Current-Context]]"]
---

# ADR-0009: `POST /auth/login` resolves `business_id` from username when omitted

## Status
`active`

## Context
The built `backend/app/auth.py` required `business_id` as a mandatory field in the login payload (enforced by `backend/tests/app/test_auth.py`, which is correct — usernames are only unique *per business*, not globally, per [[0004-username-pin-modular-auth]]). But [[Sage-MVP-Functional-Spec#10. API Surface (Draft Route Map)]] never puts `business_id` in the login payload (`POST /auth/login — username + PIN → JWT`), and the actual frontend sign-in form (`frontend/src/components/auth/sign-in-form.tsx`) only ever collected username + PIN. Wiring the real sign-in flow surfaced this contract mismatch: the frontend literally could not log in against the real backend without either collecting a business_id from the user (bad UX for a boutique retail pilot) or the backend accepting a bare username.

## Decision
`business_id` in `LoginRequest` became optional (`uuid.UUID | None = None`). When omitted, `resolve_business_id_for_username()` looks up which business(es) that username exists in:
- Exactly one match → use it, proceed to normal PIN verification.
- Zero or more-than-one match → `401 Invalid username or PIN` (deliberately indistinguishable from a wrong PIN — doesn't leak which case it was).

Existing behavior is unchanged when a caller *does* supply `business_id` explicitly (all existing tests in `test_auth.py` still pass unmodified). `LoginResponse` also gained `role: str` and `must_change_pin: bool` (currently always `false` — the PIN-change flow itself isn't built yet) to match what the frontend's `LoginResponse` type already expected.

## Alternatives considered
- **Require the frontend to collect/store a business_id** (e.g. a subdomain, an org-picker screen, or a hardcoded per-deployment constant) — rejected: adds a UI step the spec never asked for, and boutique retail pilots are single-tenant-per-deployment anyway, so the ambiguity this guards against is a real edge case, not the common case.
- **Drop the multi-tenant `business_id` requirement entirely from the `users` table** — rejected outright: this is the tenant-isolation invariant retrieval contracts depend on ([[Retrieval-Contracts]]), and CLAUDE.md treats it as law. This ADR only changes how business_id is *resolved at login*, never touches how it's *enforced* afterward — every authenticated request still carries `business_id` from the JWT and every data access still requires it.

## Consequences
- If a single Postgres instance ever hosts two businesses that happen to share a username, login for that username degrades to requiring an explicit `business_id` (logged server-side as a warning) — acceptable for now, would need a real "which store?" picker if/when Sage hosts multiple businesses per deployment.
- `backend/scripts/seed_dev_business.py` is the only way to get a first account into a fresh dev database — there's still no `/accounts` (registration) router built (see [[Known-Issues]]).

## Related
- Code: `backend/app/auth.py` (`resolve_business_id_for_username`, `LoginRequest`, `LoginResponse`, `login`)
- [[0004-username-pin-modular-auth]] — the base auth model this refines
- [[Current-Context]] — 2026-07-19 entry on frontend↔backend wiring
