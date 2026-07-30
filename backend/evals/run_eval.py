"""Run the fixed retail eval set before any store pilot (build plan §10).

Two tiers per question:
  - retrieval: does the trust decision (refuse / don't refuse) match
    expectation? Needs no LLM key — only the retriever + trust threshold.
  - generation: does the generated answer contain the expected keyword(s) and
    cite the expected file? Needs GEMINI_API_KEY; skipped (not failed) when
    it isn't configured, so this still runs in dev/CI without secrets.

Usage:
    cd backend && .venv/Scripts/python.exe -m evals.run_eval
"""

from __future__ import annotations

import asyncio
from dataclasses import dataclass

from app.agent.answer import answer_question
from app.config import get_settings
from app.db import new_business, reset_db
from app.ingestion import ingest_text
from app.retrieval import retrieve
from app.retrieval.trust import evaluate_trust
from evals.dataset import EVAL_CASES, EvalCase


@dataclass
class CaseResult:
    case: EvalCase
    retrieval_pass: bool
    generation_status: str
    generation_pass: bool

    @property
    def overall_pass(self) -> bool:
        return self.retrieval_pass and self.generation_pass


async def run_case(case: EvalCase) -> CaseResult:
    business_id = await new_business(name=f"Eval - {case.id}")
    for doc in case.seed_docs:
        await ingest_text(business_id=business_id, file_id=doc.file_id, text=doc.text)

    hits = await retrieve(business_id=business_id, query=case.question)
    decision = await evaluate_trust(business_id=business_id, question=case.question, scores=[h.score for h in hits])
    retrieval_pass = decision.refused == case.expect_refusal

    generation_status = "skipped (refusal case)"
    generation_pass = True

    if not case.expect_refusal:
        settings = get_settings()
        if not settings.gemini_api_key:
            generation_status = "skipped (no GEMINI_API_KEY)"
        elif decision.refused:
            generation_status = "skipped (retrieval unexpectedly refused)"
        else:
            try:
                result = await answer_question(business_id=business_id, user_id=None, question=case.question)
                answer_lower = result.answer.lower()
                keywords_ok = all(kw.lower() in answer_lower for kw in case.expect_keywords)
                citation_ok = case.expect_citation_file is None or any(
                    case.expect_citation_file in c.filename or case.expect_citation_file in c.file_id
                    for c in result.citations
                )
                generation_pass = keywords_ok and citation_ok
                generation_status = "ran"
            except Exception as exc:  # noqa: BLE001 - eval script must report, not crash
                generation_status = f"error: {exc}"
                generation_pass = False

    return CaseResult(
        case=case, retrieval_pass=retrieval_pass, generation_status=generation_status, generation_pass=generation_pass
    )


async def run_all() -> list[CaseResult]:
    await reset_db()
    results = []
    for case in EVAL_CASES:
        results.append(await run_case(case))
    return results


def print_report(results: list[CaseResult]) -> bool:
    print(f"\n{'CASE':<24} {'RETRIEVAL':<11} {'GENERATION':<32} {'OVERALL'}")
    print("-" * 80)
    all_pass = True
    for r in results:
        overall = "PASS" if r.overall_pass else "FAIL"
        all_pass = all_pass and r.overall_pass
        print(
            f"{r.case.id:<24} {'pass' if r.retrieval_pass else 'FAIL':<11} "
            f"{r.generation_status:<32} {overall}"
        )
    print("-" * 80)
    print("ALL PASS" if all_pass else "SOME FAILED")
    return all_pass


def main() -> int:
    results = asyncio.run(run_all())
    all_pass = print_report(results)
    return 0 if all_pass else 1


if __name__ == "__main__":
    raise SystemExit(main())
