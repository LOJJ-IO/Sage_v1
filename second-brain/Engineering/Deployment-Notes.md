---
type: deployment
status: active
tags: [area/infra]
created: 2026-07-01
updated: 2026-07-20
related: ["[[Architecture-Overview]]", "[[Tech-Stack]]", "[[0003-railway-hosting-all-services]]", "[[0008-fastapi-owned-pgvector-rag-backend]]"]
---

# Deployment Notes

## Environments
| Env | URL | Purpose | Deploy trigger |
|---|---|---|---|
| Railway `production` (`compassionate-serenity`) | public domain TBD (generate in Railway Networking) | Host FastAPI backend | Push to linked GitHub branch (`main` as of 2026-07-20) + manual redeploy |

## Railway project

- **Project:** `compassionate-serenity` (workspace: tolulase007's Projects)
- **Service:** `Sage_v1` (single service for now — backend only; frontend can be a second service later)
- **Repo:** `LOJJ-IO/Sage_v1`
- **Root Directory:** `backend` (must NOT be `frontend`)
- **Builder:** Railpack for now; local `backend/Dockerfile` + `backend/railway.toml` exist for a future Dockerfile switch once those files are on the deployed branch
- **Start command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- **Healthcheck:** `GET /health` (timeout 120s)

CLI: from repo root, `railway link -p compassionate-serenity -e production -s Sage_v1`.

Note: ADR [[0003-railway-hosting-all-services]] still says 3 services including VoltAgent; superseded in practice by [[0008-fastapi-owned-pgvector-rag-backend]] — deploy **frontend + backend** only (2 services). Backend-first is fine.

## How a release goes out
1. Merge backend changes to the branch Railway watches (`main` currently).
2. Railway auto-builds from `backend/` root, or run `railway redeploy --yes`.
3. Confirm `/health` returns `{"status":"ok"}` on the public URL.

## Rollback
Railway dashboard → Deployments → Redeploy a previous successful deployment.

## Secrets / config
Set on the **Sage_v1** service (Variables tab). Names only here — never commit values.

| Variable | Notes |
|---|---|
| `DATABASE_URL` | Must be Supabase Postgres with `postgresql+asyncpg://…` — **not** `localhost` |
| `SUPABASE_URL` / `SUPABASE_SERVICE_KEY` | Storage bucket access |
| `OPENAI_API_KEY` | Embeddings |
| `GEMINI_API_KEY` and/or `OPENROUTER_API_KEY` | LLM |
| `JWT_SECRET` | Change from dev default before any real users |
| `INTERNAL_SERVICE_TOKEN` | Change from dev default |
| `CORS_ORIGINS` | Comma-separated frontend origin(s) once frontend has a URL |
| `ENVIRONMENT` | Prefer `production` on Railway |

## Known gotcha (2026-07-20)
Service was briefly rooted at `frontend`, so Railpack built Next.js. Fixed to `backend` + uvicorn start command. `DATABASE_URL` was still pointing at local Postgres at fix time — must be swapped to Supabase or the container will crash after a successful build.

## Monitoring
- Railway service logs (`railway logs`)
- `GET /health`
- Logfire when `LOGFIRE_TOKEN` is set
