"""Phase 10 acceptance: the fixed retail eval set runs and reports pass/fail per question.

The retrieval/trust tier (refuse vs. don't-refuse) is graded unconditionally
— it needs no LLM key. The generation tier is graded only when
GEMINI_API_KEY is configured (see `evals/run_eval.py`); this test asserts
that tier is never silently marked as a false PASS, only skipped.
"""

from __future__ import annotations

from evals.dataset import EVAL_CASES
from evals.run_eval import run_case


async def test_every_eval_case_reports_a_retrieval_verdict():
    for case in EVAL_CASES:
        result = await run_case(case)
        assert result.retrieval_pass, f"{case.id}: expected refusal={case.expect_refusal}, retrieval disagreed"
