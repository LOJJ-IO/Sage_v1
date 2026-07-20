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

# Railway injects PORT. Listen on 0.0.0.0 or public networking fails.
# Migrations run via railway.toml preDeployCommand; CMD is the local fallback.
CMD exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
