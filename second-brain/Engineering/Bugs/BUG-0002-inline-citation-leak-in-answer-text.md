---
type: bug
status: resolved
tags: [area/agent, area/retrieval]
created: 2026-07-30
updated: 2026-07-30
related: ["[[BUG-0001-narrow-query-refusal-single-chunk]]", "[[FEAT-citation-sources]]", "[[Known-Issues]]"]
---

# BUG-0002: Raw citation id leaks into the user-visible answer text

## Status
`resolved` — fixed 2026-07-30.

## Symptom
User-visible chat answers sometimes included the raw internal citation bracket, e.g.:

> TurnUp was made by Toluase Ogunleye, Ronald Wopara, and Sheku Sesay from the LOJJ.io team [87cc3219b3674d309190a1813a34a705#201977].

The `[file_id#hash]` fragment is an internal id (`app/retrieval/assemble.py`'s `citation_id()`), never meant to be user-facing — sources are supposed to surface only through the separate "Sources" badges in the frontend ([[FEAT-citation-sources]]), not inline in the prose.

## Environment
Production frontend, observed alongside the BUG-0001 investigation on the same TurnUp/LOJJ.io document. Reproduced locally too — not document-specific.

## Root cause
`SageAnswer` (`backend/app/agent/sage_agent.py`) has two separate fields: `answer` (free text) and `citations` (a list of ids). The system prompt's rule 2 said every factual claim "must be backed by at least one such citation id, copied byte-for-byte from its bracket" but never said *where* that id should go — the model would sometimes (not always — reproduced as intermittent, same question worded differently sometimes leaked it and sometimes didn't) interpret this as license to write the bracket inline in `answer`, on top of also correctly populating the separate `citations` field. `answer_question()` (`backend/app/agent/answer.py`) then returned `output.answer` to the caller completely unmodified, so whatever the model wrote — bracket included — went straight to the user.

## Fix
Two changes, matching the existing philosophy elsewhere in this codebase of not trusting LLM instruction-following alone for anything correctness- or presentation-critical (same reasoning as the citation-id `output_validator` in `sage_agent.py`):
1. `SYSTEM_PROMPT` rule 2 now explicitly states citation ids belong only in the `citations` field and `answer` must be plain prose with no `[...]` markup.
2. New `_strip_inline_citations()` in `answer.py`: a defensive backstop that removes any `[cid]` substring from the final answer text for every `cid` that's actually valid in this context (so it can't eat unrelated bracketed text like "[Appendix A]"), then tidies up doubled spaces / space-before-punctuation left behind. Applied to both the persisted `ChatHistory` row and the returned `AnswerResult.answer` — the structured `citations` list is untouched, so the frontend's Sources badges still work exactly as before.

Verified: re-ran the same local repro that surfaced this — all four punctuation variants of "Who made TurnUp" now return clean prose with no bracket, while `result.citations` still carries the real, validated citation. New tests in `backend/tests/app/test_answer_citation_stripping.py` (3 cases: unit test on `_strip_inline_citations`, a check that unrelated brackets are left alone, and an end-to-end `answer_question()` test using a canned `FunctionModel` agent that deliberately leaks a real citation id inline). Full suite (42 tests) passing.

## Prevention
`test_answer_citation_stripping.py` covers this going forward. If `SageAnswer` ever grows more free-text fields, the same stripping should apply to those too before they reach a user.

## Related
[[BUG-0001-narrow-query-refusal-single-chunk]], [[FEAT-citation-sources]], [[Known-Issues]]
