---
type: architecture
status: active
tags: [area/backend, area/frontend, area/infra]
created: 2026-07-01
updated: 2026-07-19
related: ["[[Tech-Stack]]", "[[Database-Schema]]", "[[API-Documentation]]", "[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]", "[[0008-fastapi-owned-pgvector-rag-backend]]"]
---

# Architecture Overview

The living map of how the system fits together. This is the MOC for [[Architecture/Decisions|ADRs]] — when a decision changes the shape of the system, update this file's diagram/description AND write an ADR explaining why.

**MVP source of truth:** [[Sage-MVP-Functional-Spec]] (approved for implementation, v1.0).

## System diagram

```
Frontend (Next.js / React) — Railway
         |
         v
Railway Backend (FastAPI / Python) — owns everything below, in-process
         |
         v
Supabase (Postgres + pgvector, Storage) — backend-only access
         |
         v (in the same process, not a network hop)
Pydantic AI agent — Gemini 2.5 Flash Lite
```

**Hard rule:** Frontend never talks to Supabase directly. FastAPI is the single chokepoint for auth, authorization, business logic, storage proxy, retrieval, and AI orchestration — including the agent itself, which runs **in-process**, not as a separate service. See [[0002-supabase-postgres-backend-only]] and [[0008-fastapi-owned-pgvector-rag-backend]] (supersedes [[0005-voltagent-ai-microservice]]).

## Components

### frontend/
Next.js App Router project on Railway. Three-column MVP layout: file tree (left), file preview (center), Ask Sage chat (right). Currently a UI shell in `frontend/src/app/page.tsx` — **backend is built but not yet wired in**. See [[Tech-Stack]] and [[FEAT-app-shell-layout]].

Post-MVP direction (deferred): dock, tabs, connected apps — see [[Workspace-UI-Design-Decisions]].

### backend/ (FastAPI) — **built**
Owns everything, in one process (`backend/app/`):
- Auth (username+PIN behind swappable interface, JWT, roles) — `app/auth.py`, [[0004-username-pin-modular-auth]]
- Multi-tenant scoping (`business_id` required/non-defaulted on every data access; single retrieval chokepoint `app.retrieval.retrieve`)
- File lifecycle: upload → Storage → Docling extract → chunk → embed → index; delete/replace as a clean swap — `app/files/`, `app/ingestion/`
- Hybrid retrieval (pgvector + FTS + tags, RRF, FlashRank rerank) + trust threshold/refusal — `app/retrieval/`
- Sage agent in-process (Pydantic AI, citation-validated) + daily query cap + `chat_history` — `app/agent/`, `app/limits.py`
- `POST /internal/retrieve` — service-token-gated, but called from **inside the same process** now, not across a language/service boundary — `app/internal/`

Full detail + what superseded what: [[0008-fastapi-owned-pgvector-rag-backend]]. Local dev DB setup (no Docker on this machine): `backend/.devdb/README.md`.

### Supabase
Managed PostgreSQL (+ `pgvector`) + blob Storage only. No Auth, no RLS, no client SDK in frontend. See [[0002-supabase-postgres-backend-only]].

## Key ADRs (MVP)

| ADR | Decision |
|---|---|
| [[0001-fastapi-python-backend]] | FastAPI backend |
| [[0002-supabase-postgres-backend-only]] | Supabase = Postgres + Storage via backend only |
| [[0003-railway-hosting-all-services]] | Railway for frontend + backend (now 2 services, not 3 — see 0008) |
| [[0004-username-pin-modular-auth]] | Username+PIN, modular auth interface |
| ~~[[0005-voltagent-ai-microservice]]~~ | Superseded — VoltAgent microservice not built |
| ~~[[0006-keyword-retrieval-mvp]]~~ | Superseded — keyword-only MVP stage skipped |
| [[0007-boutique-retail-mvp-beachhead]] | Boutique retail MVP; workspace shell deferred |
| [[0008-fastapi-owned-pgvector-rag-backend]] | In-process Pydantic AI agent + pgvector hybrid retrieval from day one |

## How to keep this current

- New service/major component added → add a section here + update the diagram.
- Data flow changes → update this file, don't just leave it in a PR description.
- The *why* behind a structural choice belongs in an ADR ([[Architecture/Decisions]]), linked from here — this file describes *what exists*, ADRs explain *why it exists this way*.
