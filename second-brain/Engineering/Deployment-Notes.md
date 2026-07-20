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
| Railway `production` (`compassionate-serenity`) backend `Sage_v1` | https://sagev1-production.up.railway.app | Host FastAPI backend | Push to `tolu-implementations` (as of 2026-07-20) + manual redeploy |
| Railway `production` frontend `sage-frontend` | https://sage-frontend-production.up.railway.app | Host Next.js UI | Must use Root Directory `frontend` + `NEXT_PUBLIC_API_URL` |

## Railway project

- **Project:** `compassionate-serenity` (workspace: tolulase007's Projects)
- **Services:** `Sage_v1` (backend) + `sage-frontend` (Next.js)
- **Repo:** `LOJJ-IO/Sage_v1`
- **Backend Root Directory:** `/backend` (Dockerfile via `backend/railway.toml`)
- **Backend Builder:** `DOCKERFILE` / `dockerfilePath=Dockerfile` (confirmed on failed deploy `3fb4e4ae…`)
- **Start command:** `/bin/sh -c 'exec uvicorn … --port ${PORT:-8000}'` + `preDeployCommand` alembic
- **Healthcheck:** `GET /health` (timeout 300s in railway.toml)
- **Last successful backend deploy (still serving traffic):** `26a48a94…` @ 2026-07-20 11:19 — **before** PgBouncer `statement_cache_size=0` fix and before CORS restart

CLI: from repo root, `railway link -p compassionate-serenity -e production -s Sage_v1`.

Note: ADR [[0003-railway-hosting-all-services]] still says 3 services including VoltAgent; superseded in practice by [[0008-fastapi-owned-pgvector-rag-backend]] — deploy **frontend + backend** only (2 services).

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
| `CORS_ORIGINS` | Must include deployed frontend origin. Dashboard currently has `http://localhost:3000,https://sage-frontend-production.up.railway.app` — **running container may still be stale** until `railway restart` or a successful redeploy |
| `ENVIRONMENT` | Prefer `production` on Railway |
| Frontend `NEXT_PUBLIC_API_URL` | `https://sagev1-production.up.railway.app` (baked into JS at build time — confirmed in production bundle) |

## Known gotchas (2026-07-20)

1. **Wrong app running:** Deploy logs showed `next start` / Next.js 16 — not uvicorn. Railway was building the frontend while healthcheck expected FastAPI `/health`. Fix: Root Directory = `backend`, merge/deploy branch that includes `backend/Dockerfile` + `backend/railway.toml`.
2. **`$PORT` literal:** Railway `startCommand` in exec form does not expand `$PORT`. Wrap in `/bin/sh -c '…'` (fixed in `backend/railway.toml` on `tolu-implementations`).
3. **`DATABASE_URL`:** Must be Supabase Postgres with `postgresql+asyncpg://…` — **not** `localhost`. Alembic runs before uvicorn; a bad URL prevents the server from ever starting.
4. **Branch drift:** Backend fixes live on `tolu-implementations`; `main` is still frontend-heavy historically.
5. **`CORS_ORIGINS` unset / stale process → silent "Failed to fetch":** defaults to `localhost:3000` only. Live probe 2026-07-20: OPTIONS from Railway frontend origin → `400 Disallowed CORS origin` even though the variable is set — last successful container predates restart. See [[Lessons-Learned]].
6. **~30min FAILED deploys = image push, not healthcheck:** build of torch/docling/flashrank image succeeds, then stalls on repeated `image push` until Railway kills the deploy (~32m). Trial plan. Shrink image further or avoid baking heavy models into every push.
7. **PgBouncer + asyncpg:** live SUCCESS deploy still throws `DuplicatePreparedStatementError`; fix (`statement_cache_size=0` in `app/db.py`) is on branch but never shipped because pushes fail.
8. **`sage-frontend` mis-watch:** Root Directory unset + RAILPACK caused frontend service to attempt building backend commits from `tolu-implementations` and fail. Set Root Directory = `frontend`.

## Monitoring
- Railway service logs (`railway logs`)
- `GET /health`
- Logfire when `LOGFIRE_TOKEN` is set
