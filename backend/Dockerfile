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
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY evals ./evals

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
RUN python -c "from flashrank import Ranker; Ranker(model_name='ms-marco-MiniLM-L-12-v2')" \
    && docling-tools models download layout tableformer

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
