---
type: decision
status: active
tags: [area/backend, area/infra]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[0001-fastapi-python-backend]]", "[[0006-keyword-retrieval-mvp]]"]
---

# ADR-0005: VoltAgent microservice for the Sage AI agent

## Status
`active`

## Context
The backend is Python (FastAPI) but VoltAgent (`@voltagent/core`) is TypeScript-only. The agent needs model abstraction, retriever abstraction, guardrails, observability, and evals — without rearchitecting when swapping LLM providers or upgrading retrieval.

## Decision
Run **VoltAgent** as a dedicated internal Railway service (`sage-agent`):
- Node/TypeScript, `@voltagent/core` + `@voltagent/server-hono`
- Never exposed to frontend; only FastAPI calls it with a shared service token
- One `Agent` named `sage` with Section 7.7 system-prompt requirements (grounding, citations, tone, conflict handling)
- Custom `KeywordRetriever` calls FastAPI `POST /internal/retrieve` — **VoltAgent never touches Postgres or Storage**
- Input/output guardrails enforce cost limits and citation/fallback behavior
- `chat_history` in Postgres is canonical; VoltAgent memory is operational only

## Alternatives considered
- **Pure Python agent** — rejected; loses VoltAgent's model/retriever/guardrail abstractions and eval tooling.
- **VoltAgent in-process with FastAPI** — impossible (language mismatch); microservice isolates blast radius.

## Consequences
- Three-service deployment (frontend, FastAPI, sage-agent).
- Build order: stand up `sage-agent` early with stubbed `/internal/retrieve`; develop FastAPI against it in parallel.
- LLM provider is env-configured (default leaning `google/gemini-2.5-flash-lite` — not locked).

## Related
- Integration contract: [[Sage-MVP-Functional-Spec#7.8 VoltAgent integration (AI layer implementation)]]
- Retrieval: [[0006-keyword-retrieval-mvp]]
