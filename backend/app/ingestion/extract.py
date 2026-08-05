"""Docling wrapper + table linearization (build plan §3/§4).

Docling (MIT) is the locked extractor — no PyMuPDF (AGPL). Tables are
linearized into sentence-facts ("In <table>, row 2: Column=Value; ...") so a
chunker built for prose can still make each row individually retrievable and
citable, instead of losing row/column structure inside one opaque blob.

OCR is explicitly deferred (build plan §11): we only build the "looks
scanned" trigger — a low chars-per-page heuristic that flags the file for
the admin UI. Tesseract itself is not wired in.

Plain text (.txt / .md / …) bypasses Docling entirely so demo uploads never
pull torch into RSS.
"""

from __future__ import annotations

import logging
import tempfile
from dataclasses import dataclass
from pathlib import Path

logger = logging.getLogger("app.ingestion.extract")

LOW_CHARS_PER_PAGE_THRESHOLD = 200  # heuristic: below this, the page is probably a scanned image

# Suffixes that are already UTF-8 (or near) prose — no Docling/torch needed.
_PLAIN_TEXT_SUFFIXES = frozenset({".txt", ".md", ".markdown", ".csv", ".tsv", ".json", ".log"})

_converter = None


@dataclass(frozen=True)
class ExtractionResult:
    text: str
    looks_scanned: bool
    page_count: int
    # Docling's own markdown export (real tables/headings) — human preview
    # only, never chunked. None for plain text (the raw text already *is*
    # the preview).
    preview_markdown: str | None = None


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


def _decode_plain_text(content: bytes) -> str:
    """Decode upload bytes without pulling Docling/torch."""
    try:
        return content.decode("utf-8")
    except UnicodeDecodeError:
        return content.decode("utf-8", errors="replace")


def _build_converter():
    import os

    from docling.datamodel.base_models import InputFormat
    from docling.datamodel.pipeline_options import PdfPipelineOptions
    from docling.document_converter import DocumentConverter, PdfFormatOption

    # OCR is explicitly deferred (module docstring) — do_ocr defaults to True
    # in docling's PdfPipelineOptions, which silently ran full OCR on every
    # PDF page despite that stated design, and pulled OCR models (both
    # languages, both backends) into the Docker image for no reason this app
    # uses. do_table_structure stays on: tables are linearized (see below).
    pipeline_options = PdfPipelineOptions()
    pipeline_options.do_ocr = False
    pipeline_options.do_table_structure = True
    # Prefer baked-in weights from the Docker image (DOCLING_ARTIFACTS_PATH)
    # so cold deploys don't download models on the first upload request.
    artifacts_path = os.environ.get("DOCLING_ARTIFACTS_PATH")
    if artifacts_path:
        pipeline_options.artifacts_path = artifacts_path
    return DocumentConverter(format_options={InputFormat.PDF: PdfFormatOption(pipeline_options=pipeline_options)})


def _get_converter():
    """Lazy module-level singleton — one DocumentConverter per process."""
    global _converter
    if _converter is None:
        _converter = _build_converter()
    return _converter


def _extract_with_docling(path: Path) -> tuple[str, int, str]:
    from docling_core.types.doc.document import DOCUMENT_TOKENS_EXPORT_LABELS
    from docling_core.types.doc.labels import DocItemLabel

    converter = _get_converter()
    result = converter.convert(str(path))
    doc = result.document

    # Human preview, kept separate from the RAG text below: real tables,
    # headings, resolved rich cells (doc=self is implicit here, unlike
    # export_to_dataframe() further down) — never chunked/embedded.
    preview_markdown = doc.export_to_markdown()

    # Tables are excluded from the body export and re-added below via
    # `_linearize_table` instead — export_to_text()'s own `|`-delimited table
    # serialization would otherwise duplicate every table (once natively,
    # once as our sentence-facts) in the extracted text.
    body_labels = DOCUMENT_TOKENS_EXPORT_LABELS - {DocItemLabel.TABLE}
    body_text = doc.export_to_text(labels=body_labels)

    table_sentences: list[str] = []
    for table in getattr(doc, "tables", []):
        try:
            # doc=doc is required, not cosmetic: without it, any cell Docling
            # treats as "rich" (a hyperlink, merged cell, formatted run — common
            # in a docx pricing table) resolves to the literal placeholder
            # string "<!-- rich cell -->" instead of its real text.
            df = table.export_to_dataframe(doc=doc)
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
    return text, page_count, preview_markdown


def extract_text(filename: str, content: bytes) -> ExtractionResult:
    """Extract text (+ linearized tables) from raw file bytes.

    Plain text skips Docling. Binary formats write a temp file (Docling
    dispatches on suffix) and reuse a process-wide converter.
    """
    suffix = (Path(filename).suffix or "").lower()

    if suffix in _PLAIN_TEXT_SUFFIXES:
        text = _decode_plain_text(content)
        return ExtractionResult(text=text, looks_scanned=False, page_count=1)

    suffix = suffix or ".pdf"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(content)
        tmp_path = Path(tmp.name)

    try:
        text, page_count, preview_markdown = _extract_with_docling(tmp_path)
    finally:
        tmp_path.unlink(missing_ok=True)

    chars_per_page = len(text) / max(page_count, 1)
    looks_scanned = chars_per_page < LOW_CHARS_PER_PAGE_THRESHOLD

    if looks_scanned:
        logger.warning(
            "file looks scanned (chars/page=%.1f) — OCR is deferred; flagging for admin UI, not running Tesseract",
            chars_per_page,
        )

    return ExtractionResult(
        text=text, looks_scanned=looks_scanned, page_count=page_count, preview_markdown=preview_markdown
    )
