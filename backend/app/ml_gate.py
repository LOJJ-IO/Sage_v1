"""Process-wide gate for heavy ML work (Docling extract + FlashRank rerank).

A single uvicorn worker can hold both Docling/torch and FlashRank ONNX in
RSS. Under RAM pressure, overlapping extract + rerank spikes peak memory to
roughly their *sum* and triggers OOM kills or arena/BLAS allocation failures.

Serialize those paths so peak RSS ≈ max(Docling, FlashRank), not the sum.
Plain-text extraction bypasses Docling and does not need this gate.
"""

from __future__ import annotations

import asyncio

# One-at-a-time across the whole process. Semaphore(1) rather than Lock so
# future callers can raise the limit deliberately if memory headroom allows.
heavy_ml: asyncio.Semaphore = asyncio.Semaphore(1)
