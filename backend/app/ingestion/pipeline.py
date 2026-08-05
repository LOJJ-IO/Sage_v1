"""Background ingestion entry point for uploaded files (build plan §4).

Runs as a FastAPI BackgroundTask kicked off by the upload route. A
dropped/failed job must leave a visible, re-runnable status — `ingest_text`
already guarantees that (it flips `files.status` to "failed" and re-raises),
so this wrapper only needs to log the outcome, never swallow it silently.
"""

from __future__ import annotations

import asyncio
import logging
import uuid

from app.files.storage import get_storage
from app.ingestion import _set_status, ingest_text, set_preview_markdown
from app.ingestion.extract import extract_text
from app.ml_gate import heavy_ml

logger = logging.getLogger("app.ingestion.pipeline")


async def process_file(*, business_id: uuid.UUID, file_id: str, filename: str, storage_path: str) -> None:
    """extract -> linearize -> chunk -> embed -> store, driving the status machine."""
    try:
        storage = get_storage()
        content = await storage.download(storage_path)
        # extract_text() is a synchronous Docling call (model load + CPU parse,
        # network download on first use) — off the event loop so it doesn't
        # freeze concurrent /ask and /files requests on this single-worker
        # uvicorn process while one file is being ingested.
        # Serialized with FlashRank via heavy_ml so peak RSS is max(Docling,
        # FlashRank), not both stacks at once.
        async with heavy_ml:
            extraction = await asyncio.to_thread(extract_text, filename, content)

        # Orthogonal to chunking/embedding below — written now so a preview is
        # available even if the near-empty-scanned check or embedding later
        # fails this file.
        await set_preview_markdown(business_id, file_id, extraction.preview_markdown)

        # OCR is deferred (extract.py). A "scanned" file with almost no
        # extractable text would index as Ready and then every /ask about it
        # would look like a grounding refusal — same user-facing message as
        # "wrong store / wrong question". Fail loudly so the Files UI can show
        # why, instead of a false Ready state.
        if extraction.looks_scanned and len(extraction.text.strip()) < 80:
            msg = (
                "This file looks like a scanned PDF/image with almost no extractable text. "
                "OCR is not enabled yet — upload a text-based PDF, .docx, or .txt instead."
            )
            logger.warning(
                "rejecting near-empty scanned extract business_id=%s file_id=%s chars=%d",
                business_id,
                file_id,
                len(extraction.text.strip()),
            )
            await _set_status(business_id, file_id, "failed", error=msg, looks_scanned=True)
            return
    except Exception as exc:
        # download()/extract_text() failing happens before ingest_text ever
        # runs, so nothing has flipped the file's status yet — without this,
        # the file is stuck showing "pending" forever with no error recorded
        # and no signal to the admin UI that anything went wrong.
        logger.exception("extraction failed business_id=%s file_id=%s", business_id, file_id)
        await _set_status(business_id, file_id, "failed", error=str(exc))
        return

    try:
        await ingest_text(
            business_id=business_id,
            file_id=file_id,
            text=extraction.text,
            filename=filename,
            looks_scanned=extraction.looks_scanned,
        )
    except Exception:
        # ingest_text already recorded status="failed"/"pending" + error on the
        # files row; re-raising here would just crash the BackgroundTask worker
        # with no one to observe it, so we log and stop.
        logger.exception("background ingestion failed business_id=%s file_id=%s", business_id, file_id)
