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
Unblock Railway production: backend image push keeps failing (~32m), so code/env fixes (PgBouncer cache, CORS restart) never reach the live container.

## What's true right now (2026-07-20)
- Backend URL healthy: `GET https://sagev1-production.up.railway.app/health` → `{"status":"ok"}` (old SUCCESS deploy `26a48a94…`).
- Frontend URL up: `https://sage-frontend-production.up.railway.app` with `NEXT_PUBLIC_API_URL` baked to the backend — but CORS preflight from that origin is rejected by the *running* backend process.
- Latest backend deploys on `tolu-implementations` FAIL after build at Docker `image push` (heavy torch/docling image).
- PgBouncer `statement_cache_size=0` fix is committed locally/on branch but **not** on the live SUCCESS image.

## Next actions
1. `railway restart -s Sage_v1` to pick up current `CORS_ORIGINS` without a full rebuild (unblocks frontend↔backend immediately if env is already correct).
2. Shrink backend image / fix push so new commits (PgBouncer fix) can actually deploy.
3. Lock `sage-frontend` Root Directory to `frontend` so backend commits stop breaking frontend deploys.
