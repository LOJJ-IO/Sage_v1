"""650-token / 15%-overlap chunker, measured in the embedding model's tokens.

Locked by the build plan §3. `tiktoken`'s cl100k_base encoding is what
OpenAI's text-embedding-3-small tokenizer uses, so "650 tokens" here is the
same 650 the embedding model will see.

One deliberate exception to the fixed-window rule: a short document whose
*entire* text fits in a single token_size window still gets split further
along paragraph boundaries when it has more than one paragraph (see
`_split_short_document` below). Without this, a one-page multi-section
document (team info, problem, solution, roadmap, risks, ... all under 650
tokens) becomes exactly one chunk, and the reranker's cross-encoder scores a
narrow single-fact query against that whole mixed-topic chunk as a unit —
diluting genuinely-answerable questions below `trust.py`'s threshold. See
second-brain/Engineering/Bugs/BUG-0001-narrow-query-refusal-single-chunk.md
for the reproduction. This only changes the *single-window* case; documents
long enough to need the sliding window below are untouched.
"""

from __future__ import annotations

from dataclasses import dataclass

import tiktoken

from app.config import get_settings

_ENCODING_NAME = "cl100k_base"

# Below this many tokens, a standalone paragraph (e.g. a bare heading line)
# is folded into its neighbor instead of becoming its own degenerate chunk.
_MIN_SECTION_TOKENS = 20


@dataclass(frozen=True)
class ChunkSpan:
    content: str
    char_start: int
    char_end: int


def _encoding() -> tiktoken.Encoding:
    return tiktoken.get_encoding(_ENCODING_NAME)


def _paragraph_spans(text: str) -> list[tuple[int, int]]:
    """(start, end) char offsets of each non-blank line, trimmed of surrounding whitespace."""
    spans: list[tuple[int, int]] = []
    pos = 0
    for line in text.splitlines(keepends=True):
        stripped = line.strip()
        if stripped:
            start = pos + (len(line) - len(line.lstrip()))
            end = pos + len(line.rstrip())
            spans.append((start, end))
        pos += len(line)
    return spans


def _merge_small_sections(
    text: str, spans: list[tuple[int, int]], enc: tiktoken.Encoding
) -> list[tuple[int, int]]:
    """Fold paragraphs under `_MIN_SECTION_TOKENS` into a neighbor so no chunk is a bare heading."""
    merged: list[tuple[int, int]] = []
    for start, end in spans:
        if merged:
            prev_start, prev_end = merged[-1]
            if len(enc.encode(text[prev_start:prev_end])) < _MIN_SECTION_TOKENS:
                merged[-1] = (prev_start, end)
                continue
        merged.append((start, end))
    if len(merged) >= 2:
        last_start, last_end = merged[-1]
        if len(enc.encode(text[last_start:last_end])) < _MIN_SECTION_TOKENS:
            prev_start, _ = merged[-2]
            merged[-2] = (prev_start, last_end)
            merged.pop()
    return merged


def _split_short_document(text: str, enc: tiktoken.Encoding) -> list[ChunkSpan] | None:
    """Split a whole-document-fits-in-one-window text into per-paragraph chunks.

    Returns None (defer to the normal single-chunk path) when the document
    has only one paragraph — there's nothing to isolate topics from.
    """
    sections = _merge_small_sections(text, _paragraph_spans(text), enc)
    if len(sections) < 2:
        return None
    return [ChunkSpan(content=text[start:end], char_start=start, char_end=end) for start, end in sections]


def chunk_text(text: str, *, token_size: int | None = None, overlap_ratio: float | None = None) -> list[ChunkSpan]:
    """Split `text` into overlapping windows of `token_size` embedding-model tokens.

    Token <-> text offsets are exact because BPE encode/decode is a lossless
    round trip: char_start/char_end come from decoding token prefixes, not
    from a separate approximate scan.
    """
    settings = get_settings()
    token_size = token_size or settings.chunk_token_size
    overlap_ratio = settings.chunk_overlap_ratio if overlap_ratio is None else overlap_ratio

    if not text.strip():
        return []

    enc = _encoding()
    tokens = enc.encode(text)
    if not tokens:
        return []

    if len(tokens) <= token_size:
        sections = _split_short_document(text, enc)
        if sections is not None:
            return sections

    stride = max(1, round(token_size * (1 - overlap_ratio)))

    spans: list[ChunkSpan] = []
    start_tok = 0
    n = len(tokens)
    while start_tok < n:
        end_tok = min(start_tok + token_size, n)
        window = tokens[start_tok:end_tok]
        content = enc.decode(window)
        char_start = len(enc.decode(tokens[:start_tok]))
        char_end = char_start + len(content)
        spans.append(ChunkSpan(content=content, char_start=char_start, char_end=char_end))
        if end_tok >= n:
            break
        start_tok += stride

    return spans
