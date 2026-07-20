"""Docling wrapper + table linearization (build plan §3/§4).

Docling (MIT) is the locked extractor — no PyMuPDF (AGPL). Tables are
linearized into sentence-facts ("In <table>, row 2: Column=Value; ...") so a
chunker built for prose can still make each row individually retrievable and
citable, instead of losing row/column structure inside one opaque blob.

OCR is explicitly deferred (build plan §11): we only build the "looks
scanned" trigger — a low chars-per-page heuristic that flags the file for
the admin UI. Tesseract itself is not wired in.
"""

from __future__ import annotations

import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger("app.ingestion.extract")

LOW_CHARS_PER_PAGE_THRESHOLD = 200  # heuristic: below this, the page is probably a scanned image


@dataclass(frozen=True)
class ExtractionResult:
    text: str
    looks_scanned: bool
    page_count: int


def _linearize_table(table_rows: list[list[str]]) -> str:
    """Turn a table's rows into standalone sentence-facts.

    Row 0 is treated as the header. Each subsequent row becomes one sentence
    naming every column, so a chunk boundary landing mid-table never orphans
    a value from its column label.
    """
    if not table_rows:
        return ""
    header, *rows = table_rows
    sentences = []
    for row in rows:
        pairs = ", ".join(f"{h}={v}" for h, v in zip(header, row) if h)
        if pairs:
            sentences.append(f"Row: {pairs}.")
    return " ".join(sentences)


def _extract_with_docling(path: Path) -> tuple[str, int]:
    from docling.document_converter import DocumentConverter

    converter = DocumentConverter()
    result = converter.convert(str(path))
    doc = result.document

    body_text = doc.export_to_text()

    table_sentences: list[str] = []
    for table in getattr(doc, "tables", []):
        try:
            df = table.export_to_dataframe()
            rows = [list(df.columns)] + df.astype(str).values.tolist()
            linearized = _linearize_table(rows)
            if linearized:
                table_sentences.append(linearized)
        except Exception:  # noqa: BLE001 - a malformed table must not fail the whole file
            logger.warning("failed to linearize a table; skipping it", exc_info=True)

    text = body_text
    if table_sentences:
        text = text + "\n\n" + "\n".join(table_sentences)

    page_count = len(getattr(doc, "pages", []) or [1])
    return text, page_count


def extract_text(filename: str, content: bytes) -> ExtractionResult:
    """Extract text (+ linearized tables) from raw file bytes.

    Docling needs a path, so we write to a temp file with the original
    extension preserved (it dispatches on suffix).
    """
    suffix = Path(filename).suffix or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        text, page_count = _extract_with_docling(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    chars_per_page = len(text) / max(page_count, 1)
    looks_scanned = chars_per_page < LOW_CHARS_PER_PAGE_THRESHOLD

    if looks_scanned:
        logger.warning(
            "file looks scanned (chars/page=%.1f) — OCR is deferred; flagging for admin UI, not running Tesseract",
            chars_per_page,
        )

    return ExtractionResult(text=text, looks_scanned=looks_scanned, page_count=page_count)
