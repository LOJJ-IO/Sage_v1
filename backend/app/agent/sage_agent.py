"""Pydantic AI agent: Gemini 2.5 Flash Lite, thinking OFF (build plan §3/§8).

The agent never touches Postgres or Storage — it only sees the assembled
context string handed to it by `app.agent.answer`. Its one hard constraint,
enforced by `validate_citations` below (not by hoping the model behaves): every
citation id it returns must exist in that context, or the run is retried.
"""

from __future__ import annotations

from dataclasses import dataclass

from pydantic import BaseModel, Field
from pydantic_ai import Agent, ModelRetry, RunContext
from pydantic_ai.models.google import GoogleModel, GoogleModelSettings
from pydantic_ai.models.openai import OpenAIChatModel
from pydantic_ai.providers.google import GoogleProvider
from pydantic_ai.providers.openrouter import OpenRouterProvider
from pydantic_ai.settings import ModelSettings

from app.config import get_settings

SYSTEM_PROMPT = """You are Sage, a question-answering assistant for a boutique retail store's staff.

Rules, without exception:
1. Answer ONLY using the context passages given to you. Never use outside knowledge.
2. Each context passage starts with a bracketed id, like [28867fcd076e454f99b200a081e52b71#a91f3c]. Every
   factual claim must be backed by at least one such citation id, copied byte-for-byte from its
   bracket — never invent one, never shorten it, and never substitute a filename, section number, or
   anything more readable-looking for it. The passage's own text may contain section numbers or
   headings (e.g. "Section 5") — these are NEVER part of the citation id. The part after "#" is always
   the short code shown in the bracket, never a number copied from the passage's own text.
   Citation ids ALWAYS go in the separate `citations` field — never write a bracketed id inline in
   `answer`. The staff member reading `answer` should see plain, natural prose with no `[...]`
   markup of any kind; the UI shows sources separately using the `citations` field.
3. If the context does not fully support an answer, say so plainly and answer only the part you
   can support — never guess or fill gaps with assumptions.
4. Be concise and practical — staff are reading this on the shop floor, not in a meeting.
5. The context section may say "(no relevant passages found)" — this means retrieval found nothing
   grounded enough to answer with for this message. When that happens:
   - If the message is a greeting, thanks, or general chit-chat (e.g. "hi", "thanks!", "how are you") —
     respond naturally and briefly, like a helpful person would, and invite them to ask about store
     policies, hours, products, or procedures. Do not apologize or mention "grounded information."
   - If the message does look like a real question about the store that you have no supporting
     passages for, say plainly that you don't have enough grounded information to answer it
     confidently, and suggest rephrasing or checking with a manager.
   - Either way: never include a citation id, and never state or imply a specific fact about this
     store when the context section is empty — there is nothing to back it up.
"""


class SageAnswer(BaseModel):
    answer: str = Field(description="The grounded answer to the staff member's question.")
    citations: list[str] = Field(
        default_factory=list,
        description="Citation ids used to support the answer, exactly as they appear in the context brackets.",
    )


@dataclass
class AgentDeps:
    valid_citation_ids: frozenset[str]


def find_invalid_citations(citations: list[str], valid_ids: frozenset[str]) -> list[str]:
    """Which citation ids in `citations` don't exist in the assembled context.

    Pulled out of the output validator so it's directly unit-testable without
    spinning up an Agent/model at all.
    """
    return [cid for cid in citations if cid not in valid_ids]


def _build_agent() -> Agent[AgentDeps, SageAnswer]:
    settings = get_settings()

    if settings.openrouter_api_key:
        # Dev-only fallback: same Gemini model, proxied through OpenRouter's
        # OpenAI-compatible API instead of calling Google directly — useful
        # when a direct Google AI Studio key is unavailable or rate-limited.
        # Thinking-off isn't a GoogleModelSettings concept over this path.
        model = OpenAIChatModel(
            settings.openrouter_model or f"google/{settings.gemini_model}",
            provider=OpenRouterProvider(api_key=settings.openrouter_api_key),
        )
        # Without a cap this model defaults to a 65535 max_tokens request,
        # which a low-balance OpenRouter key can't afford (402) even though
        # actual answers are a few sentences — cap it well above what a
        # grounded staff-facing answer needs.
        #
        # Pinned to the "Google AI Studio" upstream specifically: routing
        # through OpenRouter's other Google backend ("Google", seen when
        # letting OpenRouter pick freely) occasionally has Gemini emit several
        # duplicate/near-duplicate tool calls in one forced-function-call
        # response, which Google's own API flags MALFORMED_FUNCTION_CALL and
        # OpenRouter surfaces as finish_reason="error" — a real upstream
        # quirk, not a prompt/schema problem. "Google AI Studio" didn't
        # reproduce it in testing.
        model_settings = ModelSettings(
            max_tokens=2048, extra_body={"provider": {"order": ["Google AI Studio"], "allow_fallbacks": False}}
        )
    else:
        model = GoogleModel(
            settings.gemini_model, provider=GoogleProvider(api_key=settings.gemini_api_key or "dev-placeholder")
        )
        model_settings = GoogleModelSettings(
            google_thinking_config={"thinking_budget": 0, "include_thoughts": False}
        )

    agent = Agent(
        model,
        deps_type=AgentDeps,
        output_type=SageAnswer,
        system_prompt=SYSTEM_PROMPT,
        model_settings=model_settings,
    )

    @agent.output_validator
    async def validate_citations(ctx: RunContext[AgentDeps], output: SageAnswer) -> SageAnswer:
        invalid = find_invalid_citations(output.citations, ctx.deps.valid_citation_ids)
        if invalid:
            raise ModelRetry(
                f"These citation ids do not exist in the provided context: {invalid}. "
                "Only cite ids that appear in brackets in the context, and cite at least one "
                "id for every factual claim."
            )
        return output

    return agent


_agent: Agent[AgentDeps, SageAnswer] | None = None


def get_agent() -> Agent[AgentDeps, SageAnswer]:
    global _agent
    if _agent is None:
        _agent = _build_agent()
    return _agent
