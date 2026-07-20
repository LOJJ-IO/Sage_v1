"""FlashRank wrapper — in-process, CPU, no hosted rerank API (locked, §3)."""

from __future__ import annotations

import logging

logger = logging.getLogger("app.retrieval.rerank")

_ranker = None
_load_failed = False


def _get_ranker():
    global _ranker, _load_failed
    if _ranker is not None or _load_failed:
        return _ranker
    try:
        from flashrank import Ranker

        # ms-marco-TinyBERT-L-2-v2 was tried for its smaller RSS, but its score
        # scale doesn't match trust.py's threshold (0.35, tuned against
        # MiniLM-L-12): a textbook-perfect match scored 0.03 under TinyBERT,
        # causing false refusals (test_relevant_query_proceeds,
        # test_every_eval_case_reports_a_retrieval_verdict). "Grounding is the
        # product" (CLAUDE.md) — don't swap the reranker without re-deriving
        # the threshold via the eval suite first.
        _ranker = Ranker(model_name="ms-marco-MiniLM-L-12-v2")
    except Exception:  # noqa: BLE001 - reranker is an optimization, not a correctness dependency
        logger.warning("FlashRank unavailable; falling back to fusion-score ordering", exc_info=True)
        _load_failed = True
        _ranker = None
    return _ranker


def rerank(query: str, candidates: list[tuple[str, str]]) -> dict[str, float]:
    """Rerank (id, text) candidates for `query`. Returns {id: score}.

    Falls back to an empty dict (caller keeps its own ordering/score) if
    FlashRank couldn't be loaded — reranking improves precision but its
    absence must never break retrieval.
    """
    if not candidates:
        return {}

    ranker = _get_ranker()
    if ranker is None:
        return {}

    from flashrank import RerankRequest

    passages = [{"id": cid, "text": text} for cid, text in candidates]
    request = RerankRequest(query=query, passages=passages)
    try:
        results = ranker.rerank(request)
    except Exception:  # noqa: BLE001 - reranking is an optimization, not a correctness dependency
        # The ONNX runtime can fail mid-inference (e.g. arena allocation
        # failure under memory pressure) — this is not just a load-time
        # concern. An unhandled failure here previously crashed the whole
        # /ask request into a raw 500; falling back to fusion-score ordering
        # (same as an unavailable ranker) keeps retrieval working, just with
        # slightly worse precision for that one request.
        logger.warning("FlashRank rerank() failed; falling back to fusion-score ordering", exc_info=True)
        return {}
    return {str(r["id"]): float(r["score"]) for r in results}
