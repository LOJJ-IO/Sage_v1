---
type: bug
status: investigating
tags: [area/retrieval, area/frontend]
created: 2026-07-28
updated: 2026-07-28
related: ["[[Known-Issues]]", "[[Lessons-Learned]]", "[[FEAT-citation-sources]]", "[[0008-fastapi-owned-pgvector-rag-backend]]"]
---

# BUG-0001: Narrow questions refused as "not enough grounded information" against a document that clearly contains the answer

## Status
`investigating` — root-caused and reproduced locally; no fix applied yet (touches locked invariants, needs a decision — see below).

## Symptom
User uploaded "New Product Brief.pdf" (LOJJ.io / TurnUp, one page). In the same chat:
- "How do I use TurnUp?" → refused
- "Describe the TurnUp user flow" → refused
- "Who made TurnUp?" → refused
- "Tell me about lojj" → **answered correctly**, citing the same file

All four questions are answerable from the same single-page document. Three of four were refused; the fourth succeeded and cited the right source. This is confusing to a user because nothing about the document changed between questions — it looks like a broken or flaky retriever.

## Environment
Production frontend (`sage-frontend-production.up.railway.app`), same session, same file.

## Root cause
Reproduced locally (`ms-marco-MiniLM-L-12-v2` FlashRank reranker, real doc text, actual `chunk_text()` call):

- The doc is 478 tokens → chunker (`backend/app/ingestion/chunk.py`, 650-token window) produces **exactly one chunk**. There is no low-scoring padding to dilute against ([[Known-Issues]]'s earlier `score_hits()`-averaging bug doesn't apply here — this is a single-chunk store).
- Rerank scores of that one chunk against each query, threshold is 0.35 (`trust.py`):

  | query | rerank score | refused? |
  |---|---|---|
  | "How do I use TurnUp?" | 0.3445 | yes (just under) |
  | "Describe the TurnUp user flow" | 0.1392 | yes |
  | "Who made TurnUp?" | 0.2289 | yes |
  | "Tell me about lojj" | 0.4794 | no |

The cross-encoder scores a query against the *whole* chunk as one unit. This chunk mixes ~8 distinct topics (team, problem, target user, solution, roadmap, risks, metrics, pilot plan) in ~480 tokens. A narrow query about one facet ("who made it") competes semantically against seven other topics packed into the same passage and scores low even though the literal answer is sitting right there in the first two lines. A broad, keyword-bearing query ("tell me about **lojj**") both (a) matches the literal token "LOJJ.io" via the FTS channel and (b) reads as generically-relevant-to-anything-in-this-passage to the cross-encoder, so it clears the bar comfortably.

This is the same failure mode already logged in [[Known-Issues]] under `backend/retrieval` ("Trust threshold can refuse genuinely-answerable questions when a document packs multiple topics into one chunk") — that entry was speculative ("Not investigated further"). This bug is the first concrete, numeric reproduction of it, on a second, unrelated document, confirming it's a real recurring pattern and not a one-off.

## Fix
Not applied. This sits on top of two locked invariants (CLAUDE.md "Sage backend — architecture invariants"):
- Chunking is fixed at 650 tokens / 15% overlap ("Locked by the build plan §3").
- `trust_score_threshold = 0.35` was deliberately tuned against MiniLM's score scale and is covered by the eval suite ([[Known-Issues]] TinyBERT incident) — lowering it isn't obviously safe without re-running evals, and doesn't address the underlying issue (a 0.20 threshold would just admit more false positives elsewhere).

Candidate directions, none applied yet — needs a product/eng call, not a unilateral change:
1. **Section-aware sub-chunking for short documents**: when a document is small enough to fit in one 650-token window but has clear structural breaks (headings, labeled fields like "Problem:", "Team Name:"), split on those breaks instead of always taking the single full-window chunk. Keeps the 650-token *ceiling* (still "locked"), just stops forcing small multi-section docs into exactly one chunk.
2. **Blend rerank score with a keyword/vector signal in `evaluate_trust`** rather than relying solely on the cross-encoder's single-chunk score, so a literal term match (e.g. "TurnUp", "LOJJ") can't be outweighed by topic dilution.
3. **Do nothing / accept as a known limitation** of small, information-dense documents until it's shown to matter enough to justify touching two locked invariants at once.

## Prevention
If a fix direction is chosen, it needs eval-suite coverage before shipping (per the TinyBERT lesson) — specifically a case with a short, multi-section document and multiple narrow single-fact queries against it, asserting all of them clear the trust threshold. That case doesn't exist in the current eval suite (which is why this reproduced in prod but not in CI).

## Related
[[Known-Issues]], [[Lessons-Learned]], [[FEAT-citation-sources]]
