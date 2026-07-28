---
type: decision
status: active
tags: [area/backend, area/infra]
created: 2026-07-19
updated: 2026-07-19
related: ["[[0001-fastapi-python-backend]]", "[[0002-supabase-postgres-backend-only]]", "[[0004-username-pin-modular-auth]]", "[[0005-voltagent-ai-microservice]]", "[[0006-keyword-retrieval-mvp]]", "[[Sage-MVP-Functional-Spec]]", "[[Database-Schema]]"]
---

# ADR-0008: FastAPI-owned, in-process pgvector hybrid RAG backend

## Status
`active` — supersedes [[0005-voltagent-ai-microservice]] and [[0006-keyword-retrieval-mvp]]

## Context
A detailed, phase-by-phase build plan was handed down for the Sage backend that locks a specific architecture end to end. It conflicts with two prior ADRs:
- ADR-0005 put the agent in a separate Node/VoltAgent microservice.
- ADR-0006 chose keyword/tag retrieval for MVP, deferring vector RAG.

The build plan instead goes straight to an **in-process** Pydantic AI agent and **pgvector hybrid retrieval** from day one, skipping the keyword-only MVP stage entirely. Per the always-applied build-plan instructions, the plan is authoritative and supersedes conflicting vault content rather than being reconciled with it.

## Decision
Implemented exactly as specified in the build plan, phases 0–10, all with real Postgres+pgvector (no mocks):

- **FastAPI owns everything.** One process touches Postgres and Storage. No Supabase Auth, no RLS — tenant isolation is enforced entirely in application code.
- **Retrieval chokepoint:** `app.retrieval.retrieve(business_id, query, ...)` in [`backend/app/retrieval/retriever.py`](../../../backend/app/retrieval/retriever.py) is the *only* path to chunk data. `business_id` is required and non-defaulted everywhere. Guarded by `backend/tests/contracts/test_tenant_isolation.py` and `test_file_lifecycle.py` — real Postgres, no mocks, never weakened.
- **Ingestion:** Docling (MIT) extraction + table linearization → tiktoken 650-token/15%-overlap chunking → OpenAI `text-embedding-3-small` (1536 dims, pinned; deterministic local feature-hashing fallback when `OPENAI_API_KEY` is unset, for dev/CI) → stored in `chunks.embedding vector(1536)`. Runs as a FastAPI `BackgroundTask` off the upload route (no Celery/Redis).
- **Hybrid retrieval:** vector (cosine) + Postgres FTS (`tsvector`/GIN) + tag-match channels, fused with Reciprocal Rank Fusion, reranked in-process with FlashRank (CPU, no external call).
- **Trust/refusal:** reranker score below threshold ⇒ explicit refusal, logged to `fallback_events` — never an improvised answer. See [`backend/app/retrieval/trust.py`](../../../backend/app/retrieval/trust.py).
- **Agent:** Pydantic AI (not LangChain/LlamaIndex/VoltAgent), Gemini 2.5 Flash Lite, thinking budget 0. Runs **in-process** — no separate microservice, no language-boundary hop. An `output_validator` rejects any citation id the model fabricates and forces a retry; only ids present in the assembled context (`file_id#chunk_index`) are ever accepted.
- **Auth:** username + PIN per business (unchanged from [[0004-username-pin-modular-auth]]), JWT carries `business_id`/role, admin vs. staff route guards.
- **Limits/guardrails:** per-**business** (not per-user) daily query cap, enforced via an atomic upsert before any retrieval/LLM call; empty/oversized questions rejected before hitting the DB.
- **Observability:** Logfire instrumenting FastAPI + Pydantic AI, conditional on `LOGFIRE_TOKEN` being set.
- **Local dev DB:** this dev machine has no Docker/WSL available without elevation, so a portable Postgres 16 + community pgvector 0.8.3 build runs as a plain user-mode process on port 55432 — see [`backend/.devdb/README.md`](../../../backend/.devdb/README.md). `backend/docker-compose.yml` is the real path for any machine that does have Docker.

## Alternatives considered
- **Keep VoltAgent microservice (ADR-0005)** — rejected: adds a language boundary and a service to deploy/monitor for no benefit once the agent framework (Pydantic AI) is itself Python and can run in-process with the retriever it calls.
- **Ship keyword-retrieval MVP first, upgrade later (ADR-0006)** — rejected: the "upgrade path" ADR-0006 anticipated is the path taken immediately; going straight to pgvector hybrid avoids a throwaway keyword-matching implementation and a later migration.
- **Mock Postgres in tests** — rejected per the build plan; contract tests run against a real Postgres+pgvector instance so tenant-isolation and lifecycle guarantees are never accidentally weakened by a fixture that doesn't reflect production behavior.

## Consequences
- Vault docs referencing "VoltAgent" or "keyword/tag retrieval" as the current plan are now historical — read ADR-0005/0006 as *what we didn't do* and this ADR as *what we did*.
- One deployable backend service instead of two (frontend + backend, not frontend + backend + agent-microservice).
- Embedding/LLM providers require real API keys (`OPENAI_API_KEY`, `GEMINI_API_KEY`) for full production behavior; local dev/CI runs on deterministic fallbacks so the pipeline is still exercisable without them (see [[Lessons-Learned]]).
- `files.looks_scanned` flags likely-scanned PDFs for the admin UI; OCR (Tesseract) itself is explicitly deferred, not implemented.

## Related
- Supersedes: [[0005-voltagent-ai-microservice]], [[0006-keyword-retrieval-mvp]]
- Builds on: [[0001-fastapi-python-backend]], [[0002-supabase-postgres-backend-only]], [[0004-username-pin-modular-auth]]
- Retrieval chokepoint: `backend/app/retrieval/retriever.py`
- Guard tests: `backend/tests/contracts/test_tenant_isolation.py`, `backend/tests/contracts/test_file_lifecycle.py`
