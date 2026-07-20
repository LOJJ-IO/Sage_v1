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
| Railway `production` (`compassionate-serenity`) | https://sagev1-production.up.railway.app | Host FastAPI backend | Push to linked GitHub branch (`main` as of 2026-07-20) + manual redeploy |

## Railway project

- **Project:** `compassionate-serenity` (workspace: tolulase007's Projects)
- **Service:** `Sage_v1` (single service for now — backend only; frontend can be a second service later)
- **Repo:** `LOJJ-IO/Sage_v1`
- **Root Directory:** `backend` (must NOT be `frontend` or repo root — 2026-07-20 logs showed Next.js starting, so healthcheck on `/health` will 503 forever)
- **Builder:** Dockerfile via `backend/railway.toml` (on `tolu-implementations`; **not yet on `main`** as of 2026-07-20)
- **Start command:** `backend/railway.toml` → `/bin/sh -c 'alembic upgrade head && uvicorn … --port ${PORT:-8000}'` (shell-wrap required for `$PORT`)
- **Healthcheck:** `GET /health` (timeout 300s in railway.toml)

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
| `CORS_ORIGINS` | Comma-separated frontend origin(s). Set to `http://localhost:3000` as of 2026-07-20 (local dev frontend testing against prod backend) — update when frontend gets a real deployed URL |
| `ENVIRONMENT` | Prefer `production` on Railway |

## Known gotchas (2026-07-20)

1. **Wrong app running:** Deploy logs showed `next start` / Next.js 16 — not uvicorn. Railway was building the frontend while healthcheck expected FastAPI `/health`. Fix: Root Directory = `backend`, merge/deploy branch that includes `backend/Dockerfile` + `backend/railway.toml`.
2. **`$PORT` literal:** Railway `startCommand` in exec form does not expand `$PORT`. Wrap in `/bin/sh -c '…'` (fixed in `backend/railway.toml` on `tolu-implementations`).
3. **`DATABASE_URL`:** Must be Supabase Postgres with `postgresql+asyncpg://…` — **not** `localhost`. Alembic runs before uvicorn; a bad URL prevents the server from ever starting.
4. **Branch drift:** Railway watches `main`; Dockerfile/railway.toml fixes are on `tolu-implementations` until merged.
5. **`CORS_ORIGINS` unset → silent "Failed to fetch":** with no `CORS_ORIGINS` variable, the app defaults to `http://localhost:3000` only (`backend/app/config.py`). Any other frontend origin gets blocked client-side by CORS with no status code and no server log entry — shows up as a bare `TypeError: Failed to fetch`, easy to mistake for the backend being down. See [[Lessons-Learned#2026-07-20 — CORS_ORIGINS unset on Railway defaults to localhost:3000 only, breaks any other frontend origin as an unhelpful "Failed to fetch"]].

## Monitoring
- Railway service logs (`railway logs`)
- `GET /health`
- Logfire when `LOGFIRE_TOKEN` is set
