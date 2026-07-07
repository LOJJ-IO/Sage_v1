---
type: roadmap
status: active
tags: [area/backend, area/frontend, area/product, priority/high]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Current-Context]]", "[[Product-Vision]]", "[[FEAT-sage-mvp]]", "[[Sage-MVP-Functional-Spec]]"]
---

# Roadmap

Directional, not a sprint plan — see [[Sprint-Log]] for what's actually shipping week to week. MVP scope: [[Sage-MVP-Functional-Spec]].

## Now
- **Plan MVP implementation** from [[FEAT-sage-mvp]] — backend + sage-agent + frontend integration
- Align existing frontend shell with MVP spec (auth UI, file tree, preview, chat)

## Next (MVP build order — suggested)

1. **Backend foundation** — FastAPI project, Supabase connection, multi-tenant schema ([[Database-Schema]])
2. **Auth** — username+PIN, JWT, account management ([[0004-username-pin-modular-auth]])
3. **File pipeline** — upload, storage proxy, text extraction, tagging ([[Sage-MVP-Functional-Spec#4]], [[Sage-MVP-Functional-Spec#5]])
4. **sage-agent** — VoltAgent service + stub `/internal/retrieve` ([[0005-voltagent-ai-microservice]])
5. **Retrieval + query** — keyword matching, `/sage/query`, chat history ([[0006-keyword-retrieval-mvp]])
6. **Personal workspace** — preferences, bookmarks, personal folders ([[Sage-MVP-Functional-Spec#6]])
7. **Frontend integration** — wire all panels to API
8. **Pre-pilot verification** — VoltAgent evals for grounding, citations, fallback behavior

## Later (post-MVP)
- Vector search (pgvector) replacing keyword retrieval
- Workspace shell: dock, tabs, connected apps ([[Workspace-UI-Design-Decisions]])
- Hotel/hospitality market expansion
- Content-based auto-tagging and auto-grouping
- Pixel-faithful DOCX preview
- Payment, notifications, integrations

## Explicitly not doing (MVP)
See [[Sage-MVP-Functional-Spec#13. Explicitly Out of Scope for MVP]]:
- File content search, vector RAG, offline mode, general-knowledge fallback
- Dock/tabs/app-slot workspace shell
- Separate manager vs supervisor permission tiers
- Multimodal image understanding
- Supabase Auth / frontend Supabase client / RLS as permission system
