"""Ungrounded messages still reach the model instead of a blind canned refusal.

Below the trust threshold, `answer_question()` used to return a fixed
REFUSAL_MESSAGE without the model ever seeing the message — "hi" and a real
unanswerable question got identical text. It now always calls the agent, with
an empty context when ungrounded, so the model can chat naturally for a
greeting while still plainly declining a genuine unsupported store question
(SYSTEM_PROMPT rule 5) — never fabricating a store-specific fact either way.
"""

from __future__ import annotations

import json

from pydantic_ai import Agent
from pydantic_ai.messages import ModelMessage, ModelResponse, ToolCallPart
from pydantic_ai.models.function import AgentInfo, FunctionModel

from app.agent import answer as answer_module
from app.agent.sage_agent import AgentDeps, SageAnswer
from app.db import new_business
from app.ingestion import ingest_text


def _build_canned_agent(answer_text: str, citations: list[str] | None = None) -> Agent[AgentDeps, SageAnswer]:
    def return_model(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        args = {"answer": answer_text, "citations": citations or []}
        return ModelResponse(parts=[ToolCallPart(info.output_tools[0].name, json.dumps(args))])

    return Agent(FunctionModel(return_model), deps_type=AgentDeps, output_type=SageAnswer)


async def test_ungrounded_message_still_reaches_the_model(monkeypatch):
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id, file_id="policy.pdf", text="Our return policy allows refunds within 14 days."
    )

    monkeypatch.setattr(
        answer_module, "get_agent", lambda: _build_canned_agent("Hi! How can I help with store policies today?")
    )

    result = await answer_module.answer_question(business_id=business_id, user_id=None, question="hi")

    assert result.answer == "Hi! How can I help with store policies today?"
    assert result.answer != answer_module.REFUSAL_MESSAGE
    assert result.citations == []
    assert result.refused is True
    assert result.reason == "NOT_ENOUGH_CONTEXT"


async def test_grounded_message_still_cites_and_is_not_refused(monkeypatch):
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="policy.pdf",
        text="Our return policy allows refunds within 14 days with a valid receipt.",
    )

    # The FunctionModel agent doesn't know real citation ids ahead of time, so
    # this only confirms the refused/reason plumbing on the grounded path —
    # citation validation itself is covered by
    # test_fabricated_citation_is_rejected_and_retried.
    monkeypatch.setattr(answer_module, "get_agent", lambda: _build_canned_agent("Refunds are accepted within 14 days."))

    result = await answer_module.answer_question(
        business_id=business_id, user_id=None, question="What is the return policy for refunds?"
    )

    assert result.refused is False
    assert result.reason is None
    assert result.answer == "Refunds are accepted within 14 days."
