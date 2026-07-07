---
type: decision
status: active
tags: [area/infra]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[Tech-Stack]]", "[[Deployment-Notes]]"]
---

# ADR-0003: Railway hosts frontend, backend, and sage-agent

## Status
`active`

## Context
MVP needs simple deployment with minimal ops overhead. Originally considered Vercel (frontend) + Railway (backend); team chose simplicity over split hosting.

## Decision
Deploy **all three Railway services** on Railway:
1. **Frontend** — Next.js
2. **Backend** — FastAPI
3. **sage-agent** — VoltAgent microservice (internal-only, private networking + shared service token)

Supabase remains external (managed Postgres + Storage). LLM API keys, DB credentials, and service tokens live in Railway env vars — never in repo or frontend.

## Alternatives considered
- **Vercel + Railway split** — rejected for MVP simplicity.
- **Self-hosted LLM on Railway** — rejected at MVP scale (~$20–50/mo compute, weaker quality); see [[Sage-MVP-Functional-Spec#7.3 LLM provider selection]].

## Consequences
- Single platform for app services; CORS or path routing needed for frontend↔backend.
- `sage-agent` never exposed publicly — FastAPI is the only external API for AI queries.

## Related
- Ops note: [[Sage-MVP-Functional-Spec#10. API Surface (Draft Route Map)]]
