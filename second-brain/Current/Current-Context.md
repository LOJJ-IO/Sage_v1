---
type: current-context
status: active
tags: [priority/high, area/infra]
created: 2026-07-20
updated: 2026-07-20
related: ["[[Deployment-Notes]]", "[[Known-Issues]]", "[[Lessons-Learned]]"]
---

# Current Context

## Active priority
Backend memory-pressure mitigations shipped locally (plain-text Docling bypass, `heavy_ml` gate, thread caps, smaller rerank pool) — **needs commit + Railway redeploy** to take effect in production. Frontend Root Directory fix still user-owned (`sage-frontend` → `frontend`).

## What's true right now (2026-07-20)
- Backend deploy `b8c66a4d…` **SUCCESS** (commit `f01c190` — CPU torch multi-stage Dockerfile). Healthcheck passed; uvicorn on `:8080`.
- Live CORS: OPTIONS from `https://sage-frontend-production.up.railway.app` → **200** + `access-control-allow-origin`.
- PgBouncer `statement_cache_size=0` is on this image (ancestor commit `26a10a4`).
- Memory crash mitigations are in the working tree (not yet deployed): see [[Known-Issues]], [[Deployment-Notes]] §9.
- FlashRank reranker is **`ms-marco-MiniLM-L-12-v2`**, not TinyBERT — TinyBERT was tried for lower RAM but its score scale broke `trust.py`'s 0.35 threshold (real match scored 0.03), causing false refusals. Reverted same day; caught by `test_relevant_query_proceeds` + the eval suite before it shipped. See [[Lessons-Learned]].

## Still open
1. Commit + redeploy backend with ML memory mitigations; confirm `/health` through upload + `/ask`.
2. User: set `sage-frontend` Root Directory = `frontend` so backend commits stop breaking frontend builds.
3. Optional cleanup: `front.html` and `.railway-config-pull-*` landed in `f01c190` — remove in a follow-up commit if undesired.
4. If OOM persists after redeploy → Railway plan RAM / workers (ops, not code).
5. If FlashRank RAM is still a concern, re-attempt a smaller model only alongside re-deriving `trust_score_threshold` from the eval suite — never swap the reranker without re-tuning the threshold in the same change.
