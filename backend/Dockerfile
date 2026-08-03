# Sage FastAPI backend — Railway / production image.
# Root Directory on the Railway service must be `backend/`.
#
# Size matters: a CUDA-flavoured torch wheel (pulled by default via docling)
# balloons the image to multi-GB and Railway's trial image-push step stalls
# for ~30 minutes then fails. Force the CPU torch index and a multi-stage
# copy so the shipped image stays pushable.
FROM python:3.12-slim-bookworm AS builder

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    HF_HOME=/root/.cache/huggingface \
    TORCH_HOME=/root/.cache/torch

# libmagic: python-magic MIME sniffing.
# build-essential: compile wheels that lack a manylinux build (stays in
# builder only — never copied to the runtime stage).
# libgl1/libglib: Docling/torchvision image ops on CPU.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libgl1 \
    libglib2.0-0 \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./

# Stub package dirs so `pip install .` can resolve project metadata (setuptools
# needs `app`/`evals` to exist per [tool.setuptools.packages.find]) without the
# real source present. This keeps the expensive layers below cached across
# app-code-only changes — real source lands via COPY further down, after which
# a cheap --no-deps reinstall relinks it. Without this split, `COPY app ./app`
# sat *before* these RUN steps and busted their cache on every single deploy,
# forcing a full network reinstall of torch/docling/flashrank + model
# re-downloads regardless of what actually changed.
RUN mkdir -p app evals && touch app/__init__.py evals/__init__.py

# Install torch+torchvision from the CPU index *before* the rest of the
# package so docling cannot resolve the default (CUDA) PyPI wheels — that
# mismatch both bloats the image (~8GB → ~2GB class) and can break imports
# (torchvision CUDA ops against CPU torch).
RUN pip install --upgrade pip \
    && pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision \
    && pip install --extra-index-url https://download.pytorch.org/whl/cpu .

# Bake models into ~/.cache so the runtime stage can COPY them.
# Without this, first /ask or upload after a cold deploy downloads over the
# network on the request path and can stall the single worker long enough
# for Railway's healthcheck to kill the deploy.
# Only layout + tableformer: OCR/code-formula/picture models are disabled
# in app/ingestion/extract.py.
# flashrank's own default cache_dir is `/tmp`, which this multi-stage build
# never copies into the runtime stage (only /root/.cache is) — explicit
# cache_dir here must match the one passed to Ranker(...) in
# app/retrieval/rerank.py, or the baked model is silently discarded and
# re-downloaded over the network on every cold container start.
RUN python -c "from flashrank import Ranker; Ranker(model_name='ms-marco-MiniLM-L-12-v2', cache_dir='/root/.cache/flashrank')" \
    && docling-tools models download layout tableformer

# Now bring in the real source and relink the package over the stub.
# --no-deps: dependencies are already installed above, nothing to resolve.
# --no-build-isolation: reuse the env's already-installed setuptools/wheel
# instead of fetching a fresh isolated build env over the network.
# This is the only layer that reruns on a normal code-only deploy.
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY evals ./evals
RUN pip install --no-deps --no-build-isolation .

# ── runtime ──────────────────────────────────────────────────────────────
FROM python:3.12-slim-bookworm

# Cap native thread pools so BLAS/ORT/OpenMP don't oversubscribe the single
# CPU worker under low RAM (local + Railway). Match these locally if you see
# OpenBLAS "memory allocation still failed" thrash.
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/root/.cache/huggingface \
    TORCH_HOME=/root/.cache/torch \
    DOCLING_ARTIFACTS_PATH=/root/.cache/docling/models \
    OMP_NUM_THREADS=1 \
    OPENBLAS_NUM_THREADS=1 \
    MKL_NUM_THREADS=1 \
    ORT_NUM_THREADS=1 \
    OMP_WAIT_POLICY=PASSIVE

RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.12/site-packages /usr/local/lib/python3.12/site-packages
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder /root/.cache /root/.cache
COPY --from=builder /app /app

# Railway injects PORT. Migrations run via railway.toml preDeployCommand.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
