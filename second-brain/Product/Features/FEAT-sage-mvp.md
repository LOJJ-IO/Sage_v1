---
type: feature
status: approved
tags: [area/backend, area/frontend, area/product, priority/high]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[Product-Vision]]", "[[Architecture-Overview]]", "[[Roadmap]]", "[[0007-boutique-retail-mvp-beachhead]]"]
---

# FEAT: Sage MVP

## Status
`approved` — ready for implementation planning

## Problem
Boutique retail staff need consistent answers from operational knowledge (SOPs, policies, product info) without relying on experienced employees or scattered documents. Knowledge walks out the door with turnover.

## Solution
Ship Sage MVP: three-column app (file tree / preview / Ask Sage chat) with:
- Admin-managed shared knowledge base (upload, tag, organize)
- Per-user personal workspace (folders, bookmarks, theme, layout)
- Username+PIN auth on shared store tablets
- Keyword/tag-based AI Q&A with citations and transparent retrieval UX
- Multi-tenant from day one

**Full functional spec (read this, don't re-derive from chat):** [[Sage-MVP-Functional-Spec]]

## Scope map

| Area | Spec section | Architecture |
|---|---|---|
| Auth & accounts | §3 | [[0004-username-pin-modular-auth]], [[API-Documentation#Auth]] |
| File management | §4 | [[API-Documentation#Files]] |
| Tagging | §5 | [[0006-keyword-retrieval-mvp]] |
| User profiles | §6 | [[Database-Schema#Per-user / personal workspace]] |
| Sage chat | §7 | [[0005-voltagent-ai-microservice]], [[0006-keyword-retrieval-mvp]] |
| Schema | §9 | [[Database-Schema]] |
| API routes | §10 | [[API-Documentation]] |
| Device assumptions | §12 | [[Sage-MVP-Functional-Spec#12. Device & Environment Assumptions]] |

## Out of scope
See [[Sage-MVP-Functional-Spec#13. Explicitly Out of Scope for MVP]] — includes vector RAG, content search, dock/tabs/app shell, offline mode, general-knowledge fallback, multimodal images, pixel-faithful DOCX preview.

## UI/UX
MVP uses simplified three-column layout (not full workspace shell). Prior workspace UX decisions ([[Workspace-UI-Design-Decisions]]) apply post-MVP unless spec says otherwise. See [[Sage-MVP-Functional-Spec#0. Relationship to Prior Sage Decisions]] for conflicts (settings: gear vs avatar).

## Technical approach
- [[Architecture-Overview]] — system diagram and components
- ADRs [[0001-fastapi-python-backend]] through [[0007-boutique-retail-mvp-beachhead]]
- Build order note: stand up `sage-agent` early with stubbed `/internal/retrieve`; develop FastAPI in parallel

## Open questions
From spec §11 — tracked in [[Sage-MVP-Functional-Spec#11. Open Items / Not Yet Decided]]:
- Final LLM provider (leaning Gemini 2.5 Flash Lite)
- Pilot pricing
- When to adopt vector search
- DOCX preview fidelity vs text preview

## Related
- Market pivot: [[0007-boutique-retail-mvp-beachhead]]
- Existing UI shell: [[FEAT-app-shell-layout]] (partial overlap; MVP spec is authoritative for scope)
