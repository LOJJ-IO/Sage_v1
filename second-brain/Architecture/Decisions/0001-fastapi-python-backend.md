---
type: decision
status: active
tags: [area/backend]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[Tech-Stack]]", "[[Architecture-Overview]]"]
---

# ADR-0001: FastAPI (Python) for the backend

## Status
`active`

## Context
Sage MVP needs a backend that owns auth, authorization, business logic, file pipeline, AI orchestration, and all database/storage access. The team already knows Python well; MVP velocity and debuggability matter more than language uniformity with the TypeScript frontend.

## Decision
Use **FastAPI (Python)** as the sole public backend API. All frontend traffic goes through FastAPI. The AI agent layer runs as a separate TypeScript microservice (see [[0005-voltagent-ai-microservice]]) but is only reachable via FastAPI.

## Alternatives considered
- **Node/Express or NestJS** — rejected for MVP because the team is stronger in Python and file/text extraction libraries (`pypdf`, `python-docx`) are mature in Python.
- **Supabase auto-generated REST** — rejected; bypasses permission logic (see [[0002-supabase-postgres-backend-only]]).

## Consequences
- Python for upload pipeline, auth, retrieval, and API surface.
- TypeScript isolated to the VoltAgent `sage-agent` service — one internal integration boundary.
- FastAPI is the single chokepoint for all business rules.

## Related
- Full scope: [[Sage-MVP-Functional-Spec#2. Stack & Infrastructure]]
- API routes: [[API-Documentation]]
