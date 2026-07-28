---
type: current-context
status: active
tags: [priority/high, area/infra]
created: 2026-07-20
updated: 2026-07-27
related: ["[[Deployment-Notes]]", "[[Known-Issues]]", "[[Lessons-Learned]]", "[[UI-UX-Guidelines]]"]
---

# Current Context

## Active priority
False "not enough grounded information" refusals on production — usually sparse/scanned extracts (OCR deferred), not a dead retriever. Files UI now shows status + scanned warning; near-empty scanned uploads fail ingest. User should re-upload text-native files for the store that was refusing.

## What's true right now (2026-07-20)
- Backend deploy live at commit `ca02e92` (memory mitigations + FlashRank cache_dir fix). Healthcheck passing; uvicorn on `:8080`.
- Live CORS: OPTIONS from `https://sage-frontend-production.up.railway.app` → **200** + `access-control-allow-origin`.
- PgBouncer `statement_cache_size=0` is on this image (ancestor commit `26a10a4`).
- Memory mitigations shipped and verified: `.txt`/`.md` bypass Docling, one shared `DocumentConverter`, `app.ml_gate.heavy_ml` semaphore serializes extract↔rerank, `CANDIDATE_POOL_SIZE=14`, native thread caps, FlashRank's baked model cache_dir fixed (was silently discarded, redownloading on every cold start).
- FlashRank reranker is **`ms-marco-MiniLM-L-12-v2`**, not TinyBERT — TinyBERT was tried for lower RAM but its score scale broke `trust.py`'s 0.35 threshold (real match scored 0.03), causing false refusals. Reverted same day; caught by `test_relevant_query_proceeds` + the eval suite before it shipped. See [[Lessons-Learned]].
- **Railway memory limit upgraded 1GB → 8GB** (user action) after code mitigations alone still left peak RSS at 762-927MB against the 1GB cap and the container OOM-crashed under just two sequential `/ask` calls. Post-upgrade: 5 sequential + 3 concurrent `/ask` requests all succeeded, peak RSS steady ~1.17GB (15% of new limit), zero crashes. See [[Known-Issues]], [[Lessons-Learned]].
- Frontend deployed as its own Railway service: `https://sage-frontend-production.up.railway.app` (manual `railway up`, not GitHub-auto-deployed — see next section).
- Production `/ask` refusals (`85280a06…`): retrieve `hits=8`, trust `top_score` ≤ 0.31; correlated with scanned PDF extract (`chars/page=136`, `chunks=1`). Threshold 0.35 kept — MiniLM scores real matches ≫ 0.35.
- Merged `origin/tolu-implementations` into `main` (2026-07-27): kept compact toasts + FormDialog settings shell; added ThemeProvider / Settings Theme tab.

## Still open
1. User: re-upload **text-based** policy docs (`.txt` / `.md` / text PDF / `.docx`) for any store still refusing; delete scanned "Ready" files that can't be answered.
2. Deploy frontend file-list status/`looks_scanned` hint + backend near-empty-scanned fail (working tree).
3. User: set `sage-frontend` Root Directory = `frontend` in the Railway dashboard, then reconnect its GitHub source (`railway service source connect --repo LOJJ-IO/Sage_v1 --branch tolu-implementations --service sage-frontend`) so future backend commits stop triggering doomed repo-root build attempts for it, and future frontend commits actually auto-deploy.
4. Optional cleanup: `front.html` and `.railway-config-pull-*` landed in `f01c190` — remove in a follow-up commit if undesired.
5. Dockerfile still reinstalls all dependencies (including CPU torch) from scratch on every deploy — `COPY app ./app` happens before `RUN pip install .`, invalidating Docker's build cache on every code change. Not urgent now that images push quickly, but worth reordering (stub-package install trick) if build times become annoying.
6. Local dev DB (`backend/.devdb`, port 55432) needs to be started manually (`pgsql/bin/pg_ctl.exe -D ./data -l ./pg.log -o "-p 55432" start`) before running the backend test suite locally — it doesn't survive a machine restart.
