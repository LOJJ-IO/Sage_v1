---
type: decision
status: active
tags: [area/backend]
created: 2026-07-06
updated: 2026-07-06
related: ["[[Sage-MVP-Functional-Spec]]", "[[0005-voltagent-ai-microservice]]", "[[Database-Schema]]"]
---

# ADR-0006: Keyword/tag-based retrieval for MVP (not vector RAG)

## Status
`active`

## Context
Sending all files to the LLM on every query is cost-prohibitive. Vector RAG is the long-term answer but adds chunking, embedding infra, and complexity. MVP needs cheap, shippable retrieval with a clear upgrade path.

## Decision
MVP retrieval: **keyword/tag-based filtering**:
- Tokenize user question, drop stopwords, match against file tags + filename tokens
- Rank by matched terms; send top 3–5 files' `extracted_text` to LLM (token budget cap)
- Text extracted **once at upload** into `files.extracted_text` — never per-query
- **Zero-match fallback:** do not answer from general knowledge; ask user to point to files; log `fallback_events` for tag improvement telemetry
- Per-user daily query cap: default 100/day

**Upgrade path:** pgvector via Supabase when keyword matching proves insufficient; `/internal/retrieve` changes internally, retriever interface stays stable.

## Alternatives considered
- **Send all files every query** — rejected (unbounded cost).
- **Single mega-file of all text** — rejected (cost grows with KB size).
- **Vector RAG at MVP** — deferred; Supabase pgvector is the natural fit when needed.
- **General-knowledge fallback when no docs match** — rejected for MVP (confident wrong answers about store policy).

## Consequences
- Tags are critical — filename auto-tagging required; force manual tags when auto-tag fails.
- Images contribute via tags/filename only (no multimodal).
- `fallback_events` table is free telemetry for tag gaps and vector-search decision.

## Related
- Tagging: [[Sage-MVP-Functional-Spec#5. Tagging System (Powers Sage's Retrieval)]]
- Chat UX: [[Sage-MVP-Functional-Spec#7. Sage Chat Behavior (Right Column)]]
