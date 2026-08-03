---
type: bug
status: resolved
tags: [area/retrieval, area/frontend]
created: 2026-07-28
updated: 2026-07-30
related: ["[[Known-Issues]]", "[[Lessons-Learned]]", "[[FEAT-citation-sources]]", "[[0008-fastapi-owned-pgvector-rag-backend]]"]
---

# BUG-0001: Narrow questions refused as "not enough grounded information" against a document that clearly contains the answer

## Status
`resolved` — section-aware sub-chunking for short documents shipped 2026-07-30 (user chose candidate direction 1 from the three below). See Fix.

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
Shipped `_split_short_document()` in `backend/app/ingestion/chunk.py` (2026-07-30). Only the single-window case changes — documents long enough to need the existing sliding window are untouched, so the 650-token/15%-overlap invariant for those is not violated; this only stops forcing a document that already fits under 650 tokens into exactly one chunk when it has multiple paragraphs to isolate.

How it works: when `chunk_text()`'s whole-document token count is `<= token_size`, it now first tries splitting the text into paragraphs (non-blank lines) via `_paragraph_spans()`. Paragraphs under `_MIN_SECTION_TOKENS` (20 tokens — e.g. a bare heading line like "Team Name: LOJJ.io") are folded into a neighboring paragraph via `_merge_small_sections()` so no chunk is a degenerate one-line fragment. If this collapses down to a single section (e.g. a genuinely single-topic short doc with no paragraph breaks), it returns `None` and the original single-chunk behavior is unchanged — this path is additive, not a behavior change for documents that don't have the multi-section shape.

Verified against the exact BUG-0001 repro (real doc text + real `ms-marco-MiniLM-L-12-v2` rerank scores, not a mock):

| query | rerank score before | rerank score after |
|---|---|---|
| "How do I use TurnUp?" | 0.34 (refused) | 0.99 (answered) |
| "Describe the TurnUp user flow" | 0.14 (refused) | 0.57 (answered) |
| "Who made TurnUp?" | 0.23 (refused) | 0.83 (answered) |
| "Tell me about lojj" | 0.48 (answered) | 0.49 (answered, unchanged) |

The doc now produces 13 chunks instead of 1 (one per merged paragraph/section). Char offsets were asserted exact (`text[char_start:char_end] == content` for every chunk) — needed since citations depend on them ([[FEAT-citation-sources]]).

The two other candidate directions from the original writeup (blending a keyword/vector signal into `evaluate_trust`; doing nothing) were not pursued — user chose section-aware sub-chunking specifically because it doesn't touch the trust gate itself, the riskier of the two locked invariants to modify.

## Prevention
- `backend/tests/app/test_chunk.py` (new): pure unit tests for `chunk_text()` — single-paragraph short doc stays one chunk (regression guard), multi-section short doc splits by paragraph, a bare heading line merges into its neighbor instead of becoming a degenerate chunk, a long document still uses the sliding window untouched, exact char-offset round-trip. No DB needed.
- `backend/evals/dataset.py`: added `STORE_PROFILE` seed doc (mirrors the shape that surfaced this — several short labeled sections) plus two new eval cases (`store-profile-who-founded`, `store-profile-mission`) asserting narrow single-fact questions against it don't get refused. Confirmed passing on the retrieval tier (`test_every_eval_case_reports_a_retrieval_verdict`) across two separate runs; the generation tier flaked once on wording (LLM wording variance choosing "beginner-friendly" over "first-time hikers" for the same correct, grounded answer) — unrelated to this fix, and passed cleanly on a second run.
- Full existing suite (39 tests) re-run after the change: all passing, no regressions.

## Follow-up: this was also the cause of an apparent "punctuation confuses the AI" symptom
2026-07-30, same session: user reported "Who made TurnUp" (no "?") answered correctly while "Who made TurnUp?" (with "?") refused, in production. Reproduced locally with the pre-fix single-chunk behavior: scores for these narrow queries (0.23–0.34) sat right at the 0.35 threshold edge, where a trivial rewording — including something as small as trailing punctuation — was enough to tip a borderline case across the refuse/answer line. Not a distinct bug or a real "punctuation" sensitivity; same root cause as this one. Re-tested after the chunking fix: "Who made TurnUp", "Who made TurnUp?", "Who made TurnUp ?", and "Who made TurnUp!" all now score 0.74–0.86 — comfortable margin above threshold regardless of trailing punctuation. **This fix is not yet deployed to production as of 2026-07-30** — production will keep showing this symptom until it ships.

## Related
[[Known-Issues]], [[Lessons-Learned]], [[FEAT-citation-sources]], [[BUG-0002-inline-citation-leak-in-answer-text]]
