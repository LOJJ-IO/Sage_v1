---
type: architecture
status: active
tags: [area/backend, area/frontend, area/infra]
created: 2026-07-01
updated: 2026-07-19
related: ["[[Architecture-Overview]]", "[[Sage-MVP-Functional-Spec]]", "[[Deployment-Notes]]", "[[0008-fastapi-owned-pgvector-rag-backend]]"]
---

# Tech Stack

Full MVP detail: [[Sage-MVP-Functional-Spec#2. Stack & Infrastructure]].

## Frontend (`frontend/`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Bootstrapped via `create-next-app` |
| UI library | React 19 | |
| Styling | Tailwind CSS 4 | via `@tailwindcss/postcss` |
| Icons | `@tabler/icons-react`, `@vscode/codicons` | codicons for VSCode-style side-panel buttons |
| Language | TypeScript 5 | |
| Lint | ESLint 9 (`eslint-config-next`) | |
| Hosting | Railway | See [[0003-railway-hosting-all-services]] |

**MVP constraint:** no Supabase client SDK in frontend — all data via FastAPI.

## Backend (`backend/`) — **built**, see [[0008-fastapi-owned-pgvector-rag-backend]]

Everything below runs **in one FastAPI process** — no separate agent microservice. `backend/app/` layout: `auth.py`, `files/`, `ingestion/`, `retrieval/`, `agent/`, `internal/`, `limits.py`, `main.py`.

| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI (Python, async) | [[0001-fastapi-python-backend]] |
| DB driver / ORM | `asyncpg` + SQLAlchemy async + Alembic | `NullPool` on the engine — required for pytest-asyncio's per-test event loops on Windows, see [[Lessons-Learned]] |
| Auth | Username + PIN (JWT), `bcrypt` directly | [[0004-username-pin-modular-auth]]. **Not** `passlib` — incompatible with `bcrypt` 4.1+, see [[Lessons-Learned]] |
| Extraction | Docling (MIT) + table linearization | Not PyMuPDF (AGPL). OCR (Tesseract) explicitly deferred — only a "looks scanned" flag |
| Chunking | `tiktoken`, 650 tokens / 15% overlap | Preserves char offsets for citations |
| Embeddings | OpenAI `text-embedding-3-small`, 1536 dims (pinned) | Deterministic local feature-hashing fallback when `OPENAI_API_KEY` unset (dev/CI only) |
| Retrieval | pgvector (cosine) + Postgres FTS + tags, fused with RRF | **Not** keyword-only — supersedes [[0006-keyword-retrieval-mvp]]. Single chokepoint: `app.retrieval.retrieve(business_id, query, ...)` |
| Rerank | FlashRank (in-process, CPU) | No external call |
| Trust/refusal | Score threshold → refuse + log `fallback_events` | Never an improvised answer |
| Agent | **Pydantic AI, in-process** | Supersedes [[0005-voltagent-ai-microservice]] (no Node/VoltAgent service) |
| LLM | Gemini 2.5 Flash Lite, thinking budget 0 | Via `pydantic_ai.providers.google.GoogleProvider` (renamed from `google_gla`, see [[Lessons-Learned]]) |
| Ingestion jobs | FastAPI `BackgroundTasks` | No Celery/Redis |
| Per-tenant limits | Daily query cap (atomic upsert), per `business_id` not per-user | |
| Observability | Logfire (FastAPI + Pydantic AI instrumentation) | Conditional on `LOGFIRE_TOKEN` |
| Hosting | Railway | |

## AI layer

Not a separate service — see "Agent" row above. `sage-agent/` as a standalone TypeScript/VoltAgent microservice ([[0005-voltagent-ai-microservice]]) was **not built**; superseded before implementation.

## Data store

| Layer | Choice | Notes |
|---|---|---|
| Database | Supabase PostgreSQL + `pgvector` | Managed Postgres; FastAPI connects directly; local dev uses a portable Postgres 16 + pgvector build (no Docker/WSL on this dev machine) — see `backend/.devdb/README.md` |
| File storage | Supabase Storage | Blob store; backend proxies all access. Local-disk fallback (`app.files.storage.LocalDiskStorage`) when Supabase env vars are unset |
| Vector search | `pgvector`, brute-force scan | From day one, not deferred. HNSW/IVFFlat index only once a tenant exceeds ~50k chunks |

## Infra / deployment

| Layer | Choice | Notes |
|---|---|---|
| Platform | Railway | Frontend + FastAPI + sage-agent (3 services) |
| External | Supabase | Postgres + Storage |
| Secrets | Railway env vars | LLM keys, DB creds, service token — never in repo |

Post-MVP scale: Railway likely stays; Convex vs Supabase TBD for DB/storage at scale.

## Why this file exists
So Claude never has to re-derive the stack from `package.json` diffing across sessions, and so version bumps/replacements are visible at a glance. Update this table whenever a dependency is added/removed/swapped for something architecturally significant.
