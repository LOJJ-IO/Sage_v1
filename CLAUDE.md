# Sage — Repo Guide for AI Agents

## Persistent memory lives in `second-brain/`

This repo has an Obsidian vault at [`second-brain/`](second-brain/00-Home.md) that functions as external memory across sessions. It is **not optional context** — treat it as more authoritative than anything you'd otherwise have to ask the user to repeat.

### Before starting any non-trivial task

1. Read [`second-brain/Current/Current-Context.md`](second-brain/Current/Current-Context.md) — active work, open questions, current priorities.
2. If the task touches system design, check [`second-brain/Architecture/Architecture-Overview.md`](second-brain/Architecture/Architecture-Overview.md) and skim [`second-brain/Architecture/Decisions/`](second-brain/Architecture/Decisions/) for relevant ADRs. Don't propose an approach that was already tried and rejected — check first.
3. If the task touches a recurring bug or a known pattern, check [`second-brain/Engineering/Known-Issues.md`](second-brain/Engineering/Known-Issues.md) and [`second-brain/Engineering/Reusable-Patterns.md`](second-brain/Engineering/Reusable-Patterns.md).
4. If the task is a feature, check whether a spec already exists in [`second-brain/Product/Features/`](second-brain/Product/Features/).

### After finishing non-trivial work, write back

- **Architecture decision made or changed?** Add a new ADR in `second-brain/Architecture/Decisions/` using [`second-brain/Templates/ADR.md`](second-brain/Templates/ADR.md). Don't edit old ADRs to reflect a new decision — supersede them (mark the old one `status: superseded`, link to the new one).
- **Bug found or fixed?** Add/update a file in `second-brain/Engineering/Bugs/` using [`second-brain/Templates/Bug-Report.md`](second-brain/Templates/Bug-Report.md). If it's fixed, set `status: resolved` and note the fix — don't delete it, it's institutional memory.
- **Feature shipped or specced?** Add/update `second-brain/Product/Features/FEAT-*.md` using [`second-brain/Templates/Feature-Spec.md`](second-brain/Templates/Feature-Spec.md).
- **Learned something non-obvious (a gotcha, a footgun, a "why didn't this work")?** Append it to [`second-brain/Engineering/Lessons-Learned.md`](second-brain/Engineering/Lessons-Learned.md).
- **Priorities or active work changed?** Update [`second-brain/Current/Current-Context.md`](second-brain/Current/Current-Context.md) directly — this file should always reflect *right now*, not history.
- **End of a working session with real progress?** Append a short entry to today's `second-brain/Daily/YYYY-MM-DD.md` (create from [`second-brain/Templates/Daily-Note.md`](second-brain/Templates/Daily-Note.md) if it doesn't exist).

### Rules

- Never duplicate a fact that already lives in the vault — link to it (`[[Note-Name]]`) instead of restating it in chat or in code comments.
- Every vault note keeps its YAML frontmatter (`type`, `status`, `tags`, `created`, `updated`, `related`) — see [`second-brain/README.md`](second-brain/README.md) for the standard. Bump `updated` whenever you edit a note.
- Prefer editing/extending an existing note over creating a new one, unless it's genuinely a new entity (new bug, new ADR, new feature).

## Repo layout

- `backend/` — backend service
- `frontend/` — Next.js frontend
- `second-brain/` — persistent engineering memory (see above)

See [`second-brain/Architecture/Tech-Stack.md`](second-brain/Architecture/Tech-Stack.md) for stack details and [`second-brain/Architecture/Architecture-Overview.md`](second-brain/Architecture/Architecture-Overview.md) for how the pieces connect.

---

## Sage backend — architecture invariants (non-negotiable)

These are locked design decisions, not defaults. When a common RAG pattern
conflicts with an invariant below, **the invariant wins** — do not silently
substitute the common pattern. If an invariant seems wrong or ambiguous,
**stop and ask**, don't "improve" it unilaterally.

1. **FastAPI owns everything** — auth, authorization, orchestration, storage
   access. It is the single chokepoint. Nothing else touches the DB or storage.
2. **Supabase is dumb infrastructure only**: managed Postgres + blob storage.
   No Supabase Auth. No Row-Level Security. No frontend Supabase SDK. Tenant
   isolation is enforced in application code, in **one place** (the retrieval
   chokepoint below).
3. **One shared Postgres, partitioned by `business_id`.** Not one project per
   tenant.
4. **Every tenant-data query is scoped by `business_id`. No cross-tenant read,
   ever.** `business_id` is a **required, non-defaulted** argument on every
   data-access function. All retrieval flows through **one** retriever
   function: `app.retrieval.retrieve(business_id, query, ...)`
   ([`backend/app/retrieval/retriever.py`](backend/app/retrieval/retriever.py)).
   If you find yourself writing a second retrieval path, stop — route it
   through here instead.
5. **Grounding is the product.** If nothing clears the trust threshold, Sage
   returns an explicit refusal (logged to `fallback_events`), never an
   improvised answer. See [`backend/app/retrieval/trust.py`](backend/app/retrieval/trust.py).
6. **Secrets from env only.** Never hardcode keys. Never log prompt text or
   retrieved chunk content at info level — that is tenant data. Log ids/counts.

Locked stack: FastAPI (async) · Supabase Postgres+Storage with pgvector,
brute-force (no HNSW/IVFFlat until ~50k chunks/tenant) · Docling extraction
(MIT, not PyMuPDF/AGPL) · 650-token/15%-overlap chunking · OpenAI
text-embedding-3-small (1536 dims, pinned) · hybrid retrieval (vector + FTS +
tags, fused with RRF) · FlashRank rerank (in-process CPU) · Pydantic AI agent
(not LangChain/LlamaIndex) · Gemini 2.5 Flash Lite, thinking off · FastAPI
BackgroundTasks for ingestion (no Celery/Redis) · Logfire observability.

Full build plan and phase-by-phase acceptance criteria: see
[`second-brain/Architecture/Decisions/0008-fastapi-owned-pgvector-rag-backend.md`](second-brain/Architecture/Decisions/0008-fastapi-owned-pgvector-rag-backend.md)
(supersedes [[0005-voltagent-ai-microservice]] and [[0006-keyword-retrieval-mvp]]).
Local dev DB (no Docker on this machine): [`backend/.devdb/README.md`](backend/.devdb/README.md).
