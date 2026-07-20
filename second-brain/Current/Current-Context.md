---
type: current-context
status: active
tags: [priority/high, area/infra]
created: 2026-07-20
updated: 2026-07-20
related: ["[[Deployment-Notes]]", "[[Lessons-Learned]]"]
---

# Current Context

## Active priority
Frontend Root Directory fix on Railway (`sage-frontend` → `frontend`) — user handling. Backend deploy unblocked.

## What's true right now (2026-07-20)
- Backend deploy `b8c66a4d…` **SUCCESS** (commit `f01c190` — CPU torch multi-stage Dockerfile). Healthcheck passed; uvicorn on `:8080`.
- Live CORS: OPTIONS from `https://sage-frontend-production.up.railway.app` → **200** + `access-control-allow-origin` (was `Disallowed CORS origin` on stale container).
- PgBouncer `statement_cache_size=0` is on this image (ancestor commit `26a10a4`).
- Frontend still has `NEXT_PUBLIC_API_URL` → backend; should call successfully now that CORS allows it.

## Still open
1. User: set `sage-frontend` Root Directory = `frontend` so backend commits stop breaking frontend builds.
2. Optional cleanup: `front.html` and `.railway-config-pull-*` landed in `f01c190` — remove in a follow-up commit if undesired.
