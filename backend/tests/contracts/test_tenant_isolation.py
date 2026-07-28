"""
Tenant-isolation guard.

The single most important invariant in Sage: a business can NEVER retrieve
another business's chunks. This bug is invisible with one store in your test
DB — it appears at store #2, in production. So we seed two businesses with
deliberately confusable content and assert the wall holds on every retrieval
path.

This test is written BEFORE the retriever. It defines the contract the
retriever must satisfy. If it doesn't compile yet, that's expected — make it
compile by building the retriever, not by weakening the test.

Wiring notes (adjust imports to your code, NOT the assertions):
  - `retrieve(business_id, query, ...)` is the ONE function every path goes
    through. `business_id` must be a required, non-defaulted argument.
  - `ingest_text(business_id, file_id, text)` runs chunk -> embed -> store.
  - Fixtures give you a clean DB per test (transaction rollback or a truncate).
"""

import pytest

from app.retrieval import retrieve  # the single retrieval chokepoint
from app.ingestion import ingest_text  # chunk -> embed -> store
from app.db import new_business, reset_db  # test helpers you provide


STORE_A_SECRET = "Store A return policy: refunds accepted within 14 days with receipt."
STORE_B_SECRET = "Store B return policy: absolutely no refunds under any circumstances."


@pytest.fixture(autouse=True)
async def clean_db():
    await reset_db()
    yield
    await reset_db()


@pytest.fixture
async def two_stores():
    a = await new_business(name="Store A")
    b = await new_business(name="Store B")
    # Same file_id on purpose: isolation must not depend on file ids being unique.
    await ingest_text(business_id=a, file_id="policy.pdf", text=STORE_A_SECRET)
    await ingest_text(business_id=b, file_id="policy.pdf", text=STORE_B_SECRET)
    return a, b


async def test_store_a_never_sees_store_b(two_stores):
    a, _ = two_stores
    # A near-identical query that matches BOTH stores' documents semantically.
    hits = await retrieve(business_id=a, query="what is the return policy")
    joined = " ".join(h.content for h in hits)
    assert "Store A" in joined
    assert "Store B" not in joined, "CROSS-TENANT LEAK: Store A retrieved Store B content"


async def test_store_b_never_sees_store_a(two_stores):
    _, b = two_stores
    hits = await retrieve(business_id=b, query="what is the return policy")
    joined = " ".join(h.content for h in hits)
    assert "Store B" in joined
    assert "Store A" not in joined, "CROSS-TENANT LEAK: Store B retrieved Store A content"


async def test_every_hit_carries_the_right_business_id(two_stores):
    a, _ = two_stores
    hits = await retrieve(business_id=a, query="refunds receipt 14 days")
    assert hits, "expected at least one hit for the querying business"
    for h in hits:
        assert h.business_id == a, "a retrieved chunk belonged to a different business"


async def test_retrieve_requires_business_id():
    """business_id must be REQUIRED — no default that silently reads all tenants."""
    with pytest.raises(TypeError):
        await retrieve(query="return policy")  # type: ignore[call-arg]


async def test_unknown_business_returns_nothing_not_everything(two_stores):
    """A business with no data must get an empty result, never a fallback to all rows."""
    ghost = await new_business(name="Store C (empty)")
    hits = await retrieve(business_id=ghost, query="return policy")
    assert hits == [], "empty business must retrieve nothing, not other tenants' data"
