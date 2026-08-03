"""Inline citation-bracket leaks must never reach the user-visible answer text.

The model sometimes writes its citation bracket inline in `answer` (e.g.
"TurnUp was made by LOJJ.io [brief.pdf#d3d080].") despite the system prompt
saying citations belong only in the separate `citations` field — LLM
instruction-following isn't a guarantee, same reasoning as citation-id
validation in test_agent.py. `answer_question()` strips any such bracket
matching a real citation id from the final answer text before it's returned
or persisted.
"""

from __future__ import annotations

import json

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agent import answer as answer_module
from app.agent.answer import _strip_inline_citations
from app.agent.sage_agent import AgentDeps, SageAnswer
from app.db import new_business
from app.ingestion import ingest_text
from app.retrieval import retrieve
from app.retrieval.assemble import assemble_context


def test_strip_inline_citations_removes_bracket_and_tidies_spacing():
    cid = "policy.pdf#abc123"
    answer = f"Refunds are accepted within 14 days [{cid}] ."
    cleaned = _strip_inline_citations(answer, frozenset({cid}))
    assert cid not in cleaned
    assert "[" not in cleaned
    assert cleaned == "Refunds are accepted within 14 days."


def test_strip_inline_citations_leaves_unrelated_brackets_alone():
    answer = "See [Appendix A] for details."
    cleaned = _strip_inline_citations(answer, frozenset({"policy.pdf#abc123"}))
    assert cleaned == answer


async def test_inline_citation_leak_is_stripped_from_final_answer(monkeypatch):
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="policy.pdf",
        text="Our return policy allows refunds within 14 days with a valid receipt.",
    )

    hits = await retrieve(business_id=business_id, query="What is the return policy for refunds?")
    assembled = assemble_context(hits)
    real_citation_id = next(iter(assembled.citation_ids))

    def return_model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        args = {
            "answer": f"Refunds are accepted within 14 days [{real_citation_id}].",
            "citations": [real_citation_id],
        }
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, json.dumps(args))])

    monkeypatch.setattr(
        answer_module,
        "get_agent",
        lambda: Agent(FunctionModel(return_model), deps_type=AgentDeps, output_type=SageAnswer),
    )

    result = await answer_module.answer_question(
        business_id=business_id, user_id=None, question="What is the return policy for refunds?"
    )

    assert real_citation_id not in result.answer
    assert "[" not in result.answer
    assert result.answer == "Refunds are accepted within 14 days."
    # The structured citation is untouched — only the inline text leak is removed.
    assert len(result.citations) == 1
    assert result.citations[0].id == real_citation_id
