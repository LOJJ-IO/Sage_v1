---
type: decision
status: active
tags: [area/backend]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[API-Documentation]]"]
---

# ADR-0004: Username + PIN auth behind a swappable interface

## Status
`active`

## Context
Boutique retail staff typically lack company email. Email/magic-link auth was ruled out — staff can't reliably open personal-phone links on a shared store computer. Sessions must work on shared tablets, not personal devices.

## Decision
MVP auth: **username + PIN** with:
- Manager-created accounts, temporary PIN, forced PIN change on first login
- JWT sessions (30-minute inactivity timeout)
- PINs hashed (bcrypt/argon2), 4–6 digits, brute-force lockout (20 failures → 15 min lock)
- Two roles: **Admin** (manager/supervisor combined) and **Staff**
- **Primary admin** (LOJJ-created at onboarding) cannot be demoted or deactivated
- Usernames unique **per business**, not globally

Auth must be built behind an **abstraction/interface** so SSO/LDAP/OAuth can replace username+PIN later without touching core Sage logic.

## Alternatives considered
- **Email/OAuth/magic link** — rejected for retail shared-device context.
- **Supabase Auth** — rejected (see [[0002-supabase-postgres-backend-only]]).
- **Separate manager vs. supervisor tiers** — rejected for MVP; treated as one Admin role.

## Consequences
- No public "sign up as admin" — LOJJ bootstraps first admin per business.
- Admin PIN re-entry required to grant admin privileges on new accounts.
- Modular auth interface is a hard architectural requirement, not optional polish.

## Related
- Full flows: [[Sage-MVP-Functional-Spec#3. Authentication]]
- Routes: [[API-Documentation#Auth]]
