"""Whole-document retrieval for "summarize <file>"-style requests.

Similarity search doesn't reliably find a document from a summarization
instruction (it doesn't resemble the document's own prose), so retrieve()
detects this intent and fetches the whole referenced file's chunks instead —
still through the single retrieve() chokepoint, not a second retrieval path.
"""

from __future__ import annotations

from app.db import new_business
from app.ingestion import ingest_text
from app.retrieval import retrieve
from app.retrieval.trust import evaluate_trust


async def test_summarize_request_retrieves_whole_named_document():
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="brief-1",
        filename="New Product Brief.pdf",
        text=(
            "The new app, TurnUp, lets customers order ahead for pickup. "
            "It launches in Q3 with a loyalty rewards tie-in. "
            "The target audience is busy commuters who want to skip the line."
        ),
    )
    await ingest_text(
        business_id=business_id,
        file_id="unrelated-1",
        filename="Store Hours.pdf",
        text="The store opens at 9am and closes at 9pm every day of the week.",
    )

    hits = await retrieve(business_id=business_id, query="Summarize the product brief please")

    assert hits, "expected the named document's chunks, not an empty/refused result"
    assert all(h.file_id == "brief-1" for h in hits)

    decision = await evaluate_trust(business_id=business_id, question="Summarize the product brief please", scores=[h.score for h in hits])
    assert decision.refused is False


async def test_summarize_request_with_no_matching_file_falls_back_to_normal_search():
    business_id = await new_business(name="Store A")
    await ingest_text(
        business_id=business_id,
        file_id="policy.pdf",
        text="Our return policy allows refunds within 14 days with a valid receipt.",
    )

    # No filename in this business resembles "quarterly earnings report" —
    # must fall back to ordinary similarity search, not error or hang.
    hits = await retrieve(business_id=business_id, query="Summarize the quarterly earnings report")

    assert isinstance(hits, list)
