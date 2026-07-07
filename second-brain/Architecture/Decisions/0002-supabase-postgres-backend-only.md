---
type: decision
status: active
tags: [area/backend, area/infra]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[Database-Schema]]", "[[Architecture-Overview]]"]
---

# ADR-0002: Supabase for PostgreSQL + Storage only — backend owns everything else

## Status
`active`

## Context
Sage needs managed PostgreSQL and blob storage. Supabase offers both, but its Auth, RLS, auto-REST, and Realtime features would create a second permission system or bypass FastAPI entirely.

## Decision
Use Supabase **only** for:
- Managed **PostgreSQL** (connection from FastAPI)
- **Storage** as a dumb blob store, accessed **exclusively through FastAPI**

Do **not** use: Supabase Auth, Row Level Security as the permission system, auto-generated REST APIs, Realtime, or any Supabase client SDK in the frontend.

## Alternatives considered
- **Supabase Auth + RLS** — rejected; username+PIN model and admin rules live in FastAPI; two permission systems are a liability.
- **Frontend Supabase client** — rejected; would ship keys to the browser and bypass the backend chokepoint.
- **Convex** — deferred to post-MVP scale evaluation.

## Consequences
- One authorization path: FastAPI middleware on every route, scoped by `business_id`.
- Supabase remains swappable — migrating DB is a connection-string change.
- All uploads/downloads proxied through backend endpoints with role checks.

## Related
- Hard rules: [[Sage-MVP-Functional-Spec#2.1 Architecture principle: the backend owns everything]]
- Schema: [[Database-Schema]]
