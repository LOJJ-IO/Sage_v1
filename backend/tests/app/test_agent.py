"""Phase 8 acceptance: citation validation, without needing a real GEMINI_API_KEY.

Uses pydantic-ai's FunctionModel to drive the exact same Agent/output_validator
wiring as production (`app.agent.sage_agent`), just swapping which "model"
answers — this is the standard pydantic-ai testing pattern, not a mock of our
own code or of Postgres.
"""

from __future__ import annotations

import json

from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agent.sage_agent import AgentDeps, SageAnswer, find_invalid_citations
from app.db import new_business
from app.ingestion import ingest_text
from app.retrieval import retrieve
from app.retrieval.assemble import assemble_context


def test_find_invalid_citations_flags_fabricated_ids():
    valid = frozenset({"policy.pdf#0", "policy.pdf#1"})
    assert find_invalid_citations(["policy.pdf#0"], valid) == []
    assert find_invalid_citations(["policy.pdf#0", "made-up.pdf#9"], valid) == ["made-up.pdf#9"]


def _build_test_agent(real_citation_id: str) -> Agent[AgentDeps, SageAnswer]:
    """Same shape as `app.agent.sage_agent._build_agent`, model swapped for FunctionModel."""

    def return_model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        assert info.output_tools is not None
        # First attempt: fabricate a citation id that doesn't exist in context.
        # Second attempt (after ModelRetry): cite a real one.
        if len(messages) == 1:
            args = {"answer": "Refunds are accepted within 14 days.", "citations": ["not-real.pdf#0"]}
        else:
            args = {"answer": "Refunds are accepted within 14 days.", "citations": [real_citation_id]}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, json.dumps(args))])

    agent = Agent(FunctionModel(return_model), deps_type=AgentDeps, output_type=SageAnswer)

    @agent.output_validator
    async def validate_citations(ctx: RunContext[AgentDeps], output: SageAnswer) -> SageAnswer:
        invalid = find_invalid_citations(output.citations, ctx.deps.valid_citation_ids)
        if invalid:
            raise ModelRetry(f"invalid citation ids: {invalid}")
        return output

    return agent


async def test_fabricated_citation_is_rejected_and_retried():
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id, file_id="policy.pdf", text="Refunds are accepted within 14 days with a receipt."
    )
    hits = await retrieve(business_id=business_id, query="refund policy")
    assembled = assemble_context(hits)
    real_citation_id = next(iter(assembled.citation_ids))

    agent = _build_test_agent(real_citation_id)
    result = await agent.run("What is the refund policy?", deps=AgentDeps(valid_citation_ids=assembled.citation_ids))

    assert result.output.citations == [real_citation_id]
    assert all(cid in assembled.citation_ids for cid in result.output.citations)
