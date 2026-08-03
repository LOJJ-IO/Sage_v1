"""Chunker unit tests (no DB needed — chunk_text is pure).

Covers the section-aware short-document split added for BUG-0001: a
multi-section document that fits in a single token_size window used to
become exactly one chunk, diluting narrow single-fact queries below
trust.py's threshold in the reranker. See
second-brain/Engineering/Bugs/BUG-0001-narrow-query-refusal-single-chunk.md.
"""

from __future__ import annotations

from app.ingestion.chunk import chunk_text


def _assert_exact_offsets(text: str, spans) -> None:
    for span in spans:
        assert text[span.char_start : span.char_end] == span.content


def test_single_paragraph_short_doc_is_one_chunk():
    """Unchanged behavior: a short doc with no paragraph breaks stays one chunk."""
    text = "Return Policy: Items may be returned within 14 days of purchase with a valid receipt."
    spans = chunk_text(text, token_size=650, overlap_ratio=0.15)
    assert len(spans) == 1
    assert spans[0].content == text
    _assert_exact_offsets(text, spans)


def test_multi_section_short_doc_splits_by_paragraph():
    text = (
        "Team Name: LOJJ.io\n"
        "Product Brief: TurnUp\n"
        "Problem: Campus isolation and student burnout are high, yet finding and "
        "attending community events is difficult due to fragmented discovery.\n"
        "Proposed Solution: TurnUp is a mobile-first web app that connects students "
        "to campus life through a Snapchat-style camera interface.\n"
    )
    spans = chunk_text(text, token_size=650, overlap_ratio=0.15)
    # "Team Name:" and "Product Brief:" are each under _MIN_SECTION_TOKENS, so
    # they fold forward into the next real paragraph rather than becoming
    # their own degenerate chunks — leaving Problem/Solution isolated from
    # each other, which is the actual goal (a narrow query about one no
    # longer has to compete against the other's tokens).
    assert len(spans) == 2
    assert spans[0].content.startswith("Team Name: LOJJ.io")
    assert spans[0].content.endswith("fragmented discovery.")
    assert spans[1].content.startswith("Proposed Solution:")
    _assert_exact_offsets(text, spans)


def test_bare_heading_line_merges_into_neighbor():
    """A short standalone line (below _MIN_SECTION_TOKENS) shouldn't become its own chunk.

    Here it merges with the only other paragraph, collapsing to a single
    section — same result as the pre-fix single-chunk behavior (whole
    original text, unmodified), just arrived at via the merge path instead
    of skipping it outright.
    """
    text = "AI Disclosure\nAI was used to brainstorm, structure, and refine wording; no user data was fabricated.\n"
    spans = chunk_text(text, token_size=650, overlap_ratio=0.15)
    assert len(spans) == 1
    assert spans[0].content == text
    _assert_exact_offsets(text, spans)


def test_long_document_still_uses_sliding_window():
    """A doc that doesn't fit in one window is untouched by the section-split path."""
    paragraph = "This is one repeated sentence used only to pad out the token count for this test. "
    text = paragraph * 200  # comfortably over 650 tokens
    spans = chunk_text(text, token_size=650, overlap_ratio=0.15)
    assert len(spans) > 1
    _assert_exact_offsets(text, spans)
    # Overlap: consecutive windows share a char range.
    assert spans[1].char_start < spans[0].char_end


def test_empty_text_returns_no_chunks():
    assert chunk_text("   \n  ", token_size=650, overlap_ratio=0.15) == []
