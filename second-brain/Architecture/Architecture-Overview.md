---
type: architecture
status: active
tags: [area/backend, area/frontend, area/infra]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Tech-Stack]]", "[[Database-Schema]]", "[[API-Documentation]]", "[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]"]
---

# Architecture Overview

The living map of how the system fits together. This is the MOC for [[Architecture/Decisions|ADRs]] — when a decision changes the shape of the system, update this file's diagram/description AND write an ADR explaining why.

**MVP source of truth:** [[Sage-MVP-Functional-Spec]] (approved for implementation, v1.0).

## System diagram

```
Frontend (Next.js / React) — Railway
         |
         v
Railway Backend (FastAPI / Python)
         |                    |
         v                    v
Supabase                 sage-agent (VoltAgent / TypeScript)
(PostgreSQL + Storage)        |
  backend-only access         v
                         LLM provider (env-configured;
                         leaning Gemini 2.5 Flash Lite)
```

**Hard rule:** Frontend never talks to Supabase or `sage-agent` directly. FastAPI is the single chokepoint for auth, authorization, business logic, storage proxy, and AI orchestration. See [[0002-supabase-postgres-backend-only]] and [[0005-voltagent-ai-microservice]].

## Components

### frontend/
Next.js App Router project on Railway. Three-column MVP layout: file tree (left), file preview (center), Ask Sage chat (right). Currently a UI shell in `frontend/src/app/page.tsx` — no backend integration yet. See [[Tech-Stack]] and [[FEAT-app-shell-layout]].

Post-MVP direction (deferred): dock, tabs, connected apps — see [[Workspace-UI-Design-Decisions]].

### backend/ (FastAPI)
Not yet implemented. Owns:
- Auth (username+PIN behind swappable interface) — [[0004-username-pin-modular-auth]]
- Multi-tenant scoping (`business_id` on every query)
- File upload pipeline (validate → store → extract text → auto-tag)
- Shared folder structure + personal workspace APIs
- Sage query endpoint (auth, daily cap, delegate to `sage-agent`, write `chat_history`)
- Internal `/internal/retrieve` for VoltAgent retriever

### sage-agent/ (VoltAgent microservice)
Dedicated internal Railway service. TypeScript, `@voltagent/core`. Never public. Calls FastAPI for retrieval; never touches DB/Storage. See [[0005-voltagent-ai-microservice]].

### Supabase
Managed PostgreSQL + blob Storage only. No Auth, no RLS, no client SDK in frontend. See [[0002-supabase-postgres-backend-only]].

## Key ADRs (MVP)

| ADR | Decision |
|---|---|
| [[0001-fastapi-python-backend]] | FastAPI backend |
| [[0002-supabase-postgres-backend-only]] | Supabase = Postgres + Storage via backend only |
| [[0003-railway-hosting-all-services]] | Railway for frontend + backend + sage-agent |
| [[0004-username-pin-modular-auth]] | Username+PIN, modular auth interface |
| [[0005-voltagent-ai-microservice]] | VoltAgent as internal AI service |
| [[0006-keyword-retrieval-mvp]] | Keyword/tag retrieval (not vector RAG) |
| [[0007-boutique-retail-mvp-beachhead]] | Boutique retail MVP; workspace shell deferred |

## How to keep this current

- New service/major component added → add a section here + update the diagram.
- Data flow changes → update this file, don't just leave it in a PR description.
- The *why* behind a structural choice belongs in an ADR ([[Architecture/Decisions]]), linked from here — this file describes *what exists*, ADRs explain *why it exists this way*.
