"""Context assembly + stable citation ids (build plan §4 Phase 8).

A citation id is derived from data (`file_id` + `chunk_index`), not a random
per-request token — the same chunk always gets the same id, so citations
stay meaningful across repeated questions and are cheap to validate against.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass

from app.retrieval.retriever import Hit


def citation_id(hit: Hit) -> str:
    """Stable per-chunk id. Deliberately not a bare `#{chunk_index}` suffix:

    when a document's own text contains numbered sections/headings (e.g.
    "Section 5"), the model reliably substitutes that in-document number for
    the real chunk index — producing a wrong but plausible-looking citation
    that fails validation almost every time for documents with numbered
    sections (confirmed: 100% reproduction rate in manual testing, even after
    an explicit system-prompt instruction not to do this). A short hash has
    no resemblance to a section number, so there's nothing for the model to
    confuse it with.
    """
    digest = hashlib.sha1(f"{hit.file_id}:{hit.chunk_index}".encode()).hexdigest()[:6]
    return f"{hit.file_id}#{digest}"


@dataclass(frozen=True)
class AssembledContext:
    context_text: str
    citation_ids: frozenset[str]
    citation_lookup: dict[str, Hit]


def assemble_context(hits: list[Hit]) -> AssembledContext:
    lookup: dict[str, Hit] = {}
    lines: list[str] = []
    for hit in hits:
        cid = citation_id(hit)
        lookup[cid] = hit
        lines.append(f"[{cid}] {hit.content}")
    return AssembledContext(
        context_text="\n\n".join(lines),
        citation_ids=frozenset(lookup),
        citation_lookup=lookup,
    )
