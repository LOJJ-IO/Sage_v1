# Sage FastAPI backend — Railway / production image.
# Root Directory on the Railway service must be `backend/`.
FROM python:3.12-slim-bookworm

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# libmagic: required by python-magic (MIME sniffing on upload).
# build-essential + rust: some deps (tiktoken, etc.) may need them on first install.
RUN apt-get update && apt-get install -y --no-install-recommends \
    libmagic1 \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml ./
COPY app ./app
COPY alembic ./alembic
COPY alembic.ini ./
COPY evals ./evals

RUN pip install .

# build-essential (gcc/g++/make) is only needed to compile wheels during
# `pip install .` above — nothing at runtime invokes a compiler. Purging it
# (and its dependency tree) after install trims a large chunk of dead weight
# off an image that's already heavy from torch/docling/flashrank, which has
# been causing very slow/failing image pushes to Railway.
RUN apt-get purge -y --auto-remove build-essential && rm -rf /var/lib/apt/lists/*

# Bake ML models into the image at build time. Without this, flashrank's
# reranker and Docling's layout/table models are fetched over the network on
# the *first* /ask or file upload after every cold deploy — a synchronous,
# unbounded-latency download sitting directly in the request path (see
# app/retrieval/rerank.py, app/ingestion/extract.py). A slow/blocked download
# there stalls the single-worker event loop long enough to fail Railway's
# healthcheck and get the deploy killed mid-request. Baking them in at build
# time removes the runtime network dependency entirely.
# Only `layout` + `tableformer`: OCR/code-formula/picture models are disabled
# in the pipeline (app/ingestion/extract.py) and this app never uses them —
# downloading docling-tools' full default bundle instead bloated the image
# with ~150MB of unused rapidocr/code-formula models.
RUN python -c "from flashrank import Ranker; Ranker(model_name='ms-marco-MiniLM-L-12-v2')" \
    && docling-tools models download layout tableformer

# Railway injects PORT. Listen on 0.0.0.0 or public networking fails.
# Migrations run via railway.toml preDeployCommand; CMD is the local fallback.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
