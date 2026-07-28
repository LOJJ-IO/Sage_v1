"""650-token / 15%-overlap chunker, measured in the embedding model's tokens.

Locked by the build plan §3. `tiktoken`'s cl100k_base encoding is what
OpenAI's text-embedding-3-small tokenizer uses, so "650 tokens" here is the
same 650 the embedding model will see.
"""

from __future__ import annotations

from dataclasses import dataclass

import tiktoken

from app.config import get_settings

_ENCODING_NAME = "cl100k_base"


@dataclass(frozen=True)
class ChunkSpan:
    content: str
    char_start: int
    char_end: int


def _encoding() -> tiktoken.Encoding:
    return tiktoken.get_encoding(_ENCODING_NAME)


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
