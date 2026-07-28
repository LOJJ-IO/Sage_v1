"""
File-lifecycle guard.

Sage's grounding promise dies if a deleted file's chunks linger: the store
removes last season's return policy, and Sage keeps confidently citing it to
staff mid-shift. Cursor will build `upload` cleanly and treat `delete` as a
one-liner against the files table, orphaning the chunks. This test makes the
cascade a hard requirement.

Contract this defines:
  - upload    -> file becomes queryable; status ends at "indexed"
  - delete    -> file's chunks are GONE and no longer retrievable
  - replace   -> old chunks gone, new content queryable (same file_id)
  - a failed/dropped ingest leaves a VISIBLE, re-runnable status (not "indexed")

Wiring notes (adjust imports, NOT assertions):
  - `ingest_text`, `delete_file`, `replace_file`, `get_file_status`,
    `count_chunks` are backend functions you provide.
  - `retrieve` is the same single chokepoint used in the isolation test.
"""

import pytest

from app.retrieval import retrieve
from app.ingestion import ingest_text, delete_file, replace_file
from app.files import get_file_status, count_chunks
from app.db import new_business, reset_db


OLD = "Winter return policy: store credit only, no cash refunds."
NEW = "Winter return policy: full cash refund within 30 days."


@pytest.fixture(autouse=True)
async def clean_db():
    await reset_db()
    yield
    await reset_db()


@pytest.fixture
async def business():
    return await new_business(name="Store A")


async def test_upload_makes_file_queryable_and_indexed(business):
    await ingest_text(business_id=business, file_id="policy.pdf", text=OLD)
    assert await get_file_status(business, "policy.pdf") == "indexed"
    hits = await retrieve(business_id=business, query="return policy")
    assert any("store credit only" in h.content for h in hits)


async def test_delete_removes_chunks(business):
    await ingest_text(business_id=business, file_id="policy.pdf", text=OLD)
    assert await count_chunks(business, "policy.pdf") > 0

    await delete_file(business_id=business, file_id="policy.pdf")

    assert await count_chunks(business, "policy.pdf") == 0, "delete left orphaned chunks"


async def test_deleted_file_is_never_retrieved_again(business):
    await ingest_text(business_id=business, file_id="policy.pdf", text=OLD)
    await delete_file(business_id=business, file_id="policy.pdf")

    hits = await retrieve(business_id=business, query="return policy")
    joined = " ".join(h.content for h in hits)
    assert "store credit only" not in joined, (
        "GROUNDING BUG: Sage retrieved a deleted document"
    )


async def test_replace_swaps_content_not_appends(business):
    await ingest_text(business_id=business, file_id="policy.pdf", text=OLD)
    await replace_file(business_id=business, file_id="policy.pdf", text=NEW)

    hits = await retrieve(business_id=business, query="return policy")
    joined = " ".join(h.content for h in hits)
    assert "full cash refund" in joined, "replace did not index new content"
    assert "store credit only" not in joined, "replace left stale chunks behind"


async def test_failed_ingest_is_visible_not_silently_indexed(business, monkeypatch):
    """
    If the embedding step fails, the file must NOT end up 'indexed'. It must land
    in a visible, re-runnable state. Simulate a failure in the embed step.
    """
    from app import ingestion

    async def boom(*args, **kwargs):
        raise RuntimeError("embedding provider down")

    monkeypatch.setattr(ingestion, "embed_chunks", boom)

    with pytest.raises(RuntimeError):
        await ingest_text(business_id=business, file_id="policy.pdf", text=OLD)

    status = await get_file_status(business, "policy.pdf")
    assert status in {"failed", "pending"}, (
        f"dropped ingest left status={status!r}; must be visible/re-runnable"
    )
    assert status != "indexed", "file reported indexed despite embedding failure"
