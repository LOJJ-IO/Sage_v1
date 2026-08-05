---
type: lessons
status: active
tags: [area/frontend]
created: 2026-07-01
updated: 2026-08-04
related: ["[[Engineering/Bugs]]", "[[Troubleshooting]]", "[[UI-UX-Guidelines]]", "[[Stacking-Contexts-and-Portals]]", "[[Current-Context]]", "[[FEAT-sign-in]]", "[[FEAT-preview-tabs]]"]
---

# Lessons Learned

Append-only log of non-obvious gotchas.

## Format
```
### YYYY-MM-DD — short title
What happened / what was surprising.
Why it happened.
What to do differently.
```

## Entries

### 2026-08-02 — Logfire FastAPI instrumentation 500s every browser CORS OPTIONS (sign-in "doesn't work")
Local sign-in looked broken ("Unable to sign in" / network error). Backend logs showed `OPTIONS /auth/login` → 500 with `AttributeError: '_IncludedRouter' object has no attribute 'path'` inside `opentelemetry.instrumentation.fastapi`. FastAPI ≥0.137 stores `include_router()` children as `_IncludedRouter` nodes; OTel's route walker reads `.path` on CORS preflight partial matches and crashes before `CORSMiddleware` can answer. Browser never sends `POST /auth/login`.
**Fix (interim):** skip `logfire.instrument_fastapi(app)` in `app/main.py` until `opentelemetry-instrumentation-fastapi` includes the 0.137 fix (PR #4700). Keep `configure` + `instrument_pydantic_ai`. Hard-restart uvicorn if `--reload` hangs after the edit.
**Rule:** a failing OPTIONS preflight presents as "frontend auth broken"; always curl OPTIONS with `Origin` before debugging credentials.

### 2026-07-30 — Tag suggestion menu should track the caret, not the field shell
**Symptom:** Autocomplete always opened at the left edge of the tag box, far from where you were typing once chips filled the row.
**Cause:** Position used `shellRef.getBoundingClientRect()` — fixed to the control, not the draft caret.
**Fix:** Measure text before `selectionStart` (canvas `measureText` + input padding/scroll) and place the portal under that viewport point; re-run on draft/selection/scroll/resize.
**Rule:** Combobox menus belong at the insertion point; field-shell anchoring only works when the input never moves inside the shell.

### 2026-07-30 — Tag draft input `min-w-32` / `basis-32` leaves dead space before wrap
**Symptom:** Chips filled only part of a row; “Add a tag” jumped to the next line while the first row still had empty room.
**Cause:** Flex wrap only puts the next item on the current line if it fits its **minimum** size. An 8rem (`min-w-32` + `basis-32`) draft input refused leftover scraps of the row and wrapped early.
**Fix:** `min-w-[3ch] basis-[3ch] flex-1` so the caret fills remaining space; hide placeholder once chips exist (long placeholder shouldn’t force layout).
**Rule:** In chip+input fields, the draft control’s min/basis must be caret-sized, not “comfortable empty-field” sized — comfort comes from `flex-1` when the row is empty.

### 2026-07-30 — Chip labels: `flex-1` + truncate adds empty space on short tags
**Symptom:** Short Edit-tags chips (e.g. “yes”) showed a dead gap after the ×; longer chips looked fine.
**Cause:** Label used `flex-1` so it would shrink/ellipsis inside `max-w-[min(70%,24ch)]`. Grow also absorbs leftover width when the pill’s used size isn’t pure content-fit — short labels stretch and leave padding after the remove control.
**Fix:** Chip `w-fit`; label `min-w-0 truncate` only (no `flex-1`). Max-width still caps long tags; truncate still works because `min-w-0` lets the label shrink.

### 2026-07-30 — Tag autocomplete inside a dialog needs a body portal, not Base UI Popover
**Symptom:** Edit tags focused “Add a tag” with library tags available, but no suggestion menu appeared.
**Cause:** Anchored `Popover` without a trigger fought input focus; same `z-50` as the dialog left the menu invisible/under. Filtering only unused library tags is correct — if every library tag is already on the file, the list stays empty.
**Fix:** Portaled `fixed` list at `z-100` under the field (`getBoundingClientRect`); open on focus when suggestions remain; rank prefix then `includes` while typing.
**Rule:** Combobox-in-dialog → portal above dialog z; don’t reuse focus-stealing PopoverTrigger for an always-focused input.

### 2026-07-30 — Truncate with `ch` + container %, not fixed px
**Symptom:** Long filenames wrapped the Edit tags description; long tags blew out the chip field.
**Principle:** Ellipsis relative to type (`ch`) and parent (`min(70%, 24ch)` for chips, `min(100%, 28ch)` for prose). Full string via tooltip. See `lib/ui/truncate.ts`.
**Don't:** hardcode `max-w-48` / rem caps that ignore font size and field width.

### 2026-07-30 — Stadium (`rounded-full`) inputs look “gummy” on wide fields
**Symptom:** Full-width text fields read as stretched pills — soft double edge, weak border, label collapsed into the control.
**Cause:** `rounded-full` + `shadow-sm` + light `border-border` on a tall input; placeholder used full muted weight next to the label.
**Fix:** `Input` / `Field*` use `rounded-lg` (~10px), no shadow, `border-foreground/20`, `h-10`, lighter placeholder (`/65`). Keep `rounded-full` for true pills (buttons, tags, search bars).

### 2026-07-30 — Preview download with empty `NEXT_PUBLIC_API_URL` 404s on Next.js, not the API
Phase 9 called `downloadBackendFile` which did `fetch(\`${baseUrl}/files/.../content\`)`. When `baseUrl` is `""`, that becomes a **relative** URL, so the browser hits the Next.dev server (`GET /files/.../content` → 404). Standalone mode already keeps the real `File` in `useFileLibrary` (`crypto.randomUUID()` ids) — dashed UUIDs in the 404 path were the giveaway vs backend `uuid4().hex` ids.
**Fix:** prefer `LibraryFile.file` when `size > 0` for blob previews; guard `downloadBackendFile` so a missing API URL throws instead of relative-fetching.
**Rule:** any `fetch(baseUrl + path)` helper must refuse an empty base URL the same way `apiFetch` does; dual-mode UIs must use local bytes when the backend isn't the source of truth.

### 2026-07-30 — `data-active` on the lane item does nothing until CSS selects it
Preview-tab design says hover *or* active hides the dividers that touch that tab. The lane already set `data-active=""` on the active lane item, but `preview-tab-chrome.css` only had hover `:has(.preview-tab-chrome:hover)` rules — so active tabs still showed bordering dividers.
**Why:** markup readiness ≠ behavior. The attribute is a hook; two sibling selectors (`[data-active] + .preview-tab-divider` and `.preview-tab-divider:has(+ …[data-active])`) are what actually hide the left and right dividers.
**Rule:** when the invariant is “any divider touching X,” verify both the DOM flag *and* the CSS that targets that flag — don’t stop at one.

### 2026-07-27 — Toast host's `right-4` didn't match the shell's `px-2` inset, so it never lined up with the header/content
After the toast host was portaled to `document.body` (see the entry directly below), it kept `right-4` (1rem) as its right inset. The header icon row (`frontend/src/app/page.tsx`, top toolbar div) and the content grid beneath it both use `px-2` (0.5rem) as their shared right inset. A `fixed`-positioned element outside the normal layout tree doesn't inherit or get checked against a sibling's padding — nothing enforces that two independently-positioned elements agree on the same inset, so the toast's right edge sat 8px further left than the icon row and grid's right edge above/below it, which read as visibly "off" in a screenshot even though each element's own CSS was internally correct.
**Fix:** changed `TOAST_HOST_CLASS` right inset from `right-4` to `right-2` in `frontend/src/components/providers/toast-provider.tsx` to match the shell's `px-2` rhythm.
**Rule going forward:** when a component is intentionally taken out of the normal layout flow (portaled to `document.body`, `fixed`/`absolute` positioned), any spacing constants it uses (inset, width, gap) must be diffed against the layout it's meant to visually align with — grep the sibling containers' padding/margin values rather than picking a Tailwind spacing token that merely "looks about right."

### 2026-07-27 — Toast `z-[60]` inside Ask column still loses to dialog `z-50` on `document.body`
Toasts looked “broken” after Save (Settings / tags / delete): state updated, but nothing visible.
**Why:** `ToastViewport` lived in the Ask panel grid cell (`absolute` + local `z-[60]`). Dialogs portal to `document.body` at `z-50`. Local z-index never competes across stacking roots — the backdrop covers the whole page tree. Collapsing the Ask column to `0px` also registered a viewport and hid the fallback host, clipping toasts entirely.
**Fix:** portal a single fixed toast host to `document.body` at `z-[100]` from `ToastProvider`. Notifications and modals must share the same stacking root. See [[UI-UX-Guidelines#Toasts (application-owned)]], [[Stacking-Contexts-and-Portals]].

### 2026-07-20 — Multi-stage Docker builds silently drop baked artifacts written outside the COPY'd paths
`backend/Dockerfile`'s bake step (`RUN python -c "from flashrank import Ranker; Ranker(model_name=...)"`) was meant to pre-download the reranker model at build time so no container ever hits the network on its first `/ask`. It kept "working" (no error) but production logs still showed `Downloading ms-marco-MiniLM-L-12-v2...` on every fresh deploy. Cause: `flashrank.Ranker`'s own default `cache_dir` is `/tmp`, and the runtime stage only does `COPY --from=builder /root/.cache /root/.cache` (plus site-packages/bin/app) — `/tmp` from the builder stage is simply never copied, so the baked model is discarded and re-fetched from the network on every cold start.
**Why it wasn't obvious:** the build always succeeded, the app always worked, nothing ever threw — the only symptom was a log line during real requests, easy to miss unless you're specifically checking that "baked in" claims hold up live.
**Fix:** pass an explicit `cache_dir="/root/.cache/flashrank"` to `Ranker(...)` in *both* the Dockerfile's bake command and the app code that constructs it at runtime — they must agree on a path that's actually inside what the final `COPY --from=builder` list preserves. **General rule: in a multi-stage build, any "bake this into the image" step must write under a path you explicitly `COPY --from=builder`, and you should verify this by checking runtime logs for the thing you tried to eliminate (a download, a cold-start delay) after the first real deploy — a successful build says nothing about whether the artifact actually survived into the runtime image.**

### 2026-07-20 — A code-side memory fix can be real and still not enough if the container's hard limit is the actual bottleneck
A full pass of memory-pressure mitigations (Docling text fast-path, one shared `DocumentConverter`, a process-wide semaphore serializing Docling extract and FlashRank rerank, a smaller rerank candidate pool, native thread-count caps, plus the cache_dir fix above) measurably reduced Railway's peak RSS from 927MB to 762MB against a 1GB service memory limit (`railway metrics --memory`). All of it was worth shipping — lower baseline, better latency under load, graceful degradation on ONNX failure. **But the container still OOM-crashed** on nothing more than two sequential `/ask` calls, because ONNX Runtime's default memory arena grows to fit peak usage per process and doesn't hand memory back to the OS afterward — the *second* request inherits whatever the *first* one already claimed, and no amount of per-request code tuning changes that steady-state floor once it's already loaded a full model.
**Fix:** the user upgraded the Railway service's memory limit from 1GB to 8GB. Immediately after, 5 sequential + 3 concurrent `/ask` requests all succeeded with peak RSS steady at ~1.17GB (15% of the new limit) — zero crashes.
**Lesson:** when `railway metrics --memory` (or equivalent) shows peak usage sitting at 75-90%+ of a hard limit even after real, verified code-side memory reductions, that's a signal to check the actual resource ceiling before continuing to chase code changes — some memory floors (a loaded ML runtime, a language VM's baseline heap) are inherent to the stack you've chosen (ADR-0008 keeps Docling + FlashRank in-process by design) and the fix is more headroom, not more cleverness. Measure before *and after* infra changes too — "we upgraded the plan" isn't confirmed fixed until you've re-run the same stress test and watched the same metric.

### 2026-07-20 — Swapping a reranker model without re-deriving the trust threshold caused false refusals
A memory-reduction pass (see [[Known-Issues]]) swapped FlashRank's `ms-marco-MiniLM-L-12-v2` for the much smaller `ms-marco-TinyBERT-L-2-v2`. It loaded fine and inference ran without error — no exception, no crash, nothing that would show up in logs. But `app/retrieval/trust.py`'s `evaluate_trust` gates on a fixed `trust_score_threshold = 0.35`, calibrated against MiniLM's score scale. TinyBERT (2 layers vs. MiniLM's 12) produces a compressed, much lower score range: a textbook-perfect match ("Our return policy allows refunds within 14 days with a valid receipt." for "What is the return policy for refunds?") scored **0.03** — nowhere near 0.35 — so `evaluate_trust` refused a question Sage had a clean, direct answer for. Caught by `test_relevant_query_proceeds` and the eval suite (`test_every_eval_case_reports_a_retrieval_verdict`) before it shipped, not by manual testing.
**Why this is dangerous:** it fails *silently and gracefully* from the system's point of view — no crash, no error log, no 500. It just makes Sage wrongly say "I don't have enough information," which is the one failure mode CLAUDE.md's "grounding is the product" invariant is designed to prevent from being *wrong* in the other direction (false refusal instead of false confidence) — a false refusal is a real product defect, not a safe fallback, and would be very easy to miss without a test asserting `refused is False` for a known-answerable question.
**Fix:** reverted to `ms-marco-MiniLM-L-12-v2`. **Rule going forward: never swap a scoring/reranking model without re-running the eval suite and, if scores shifted, re-deriving the threshold in the *same* change** — a different model's score distribution is not guaranteed to resemble the one a fixed threshold was tuned against, and nothing about a successful model *load* tells you whether its *scores* still mean the same thing.

### 2026-07-20 — Peak RSS is max of overlapping ML stacks, not either alone
On a single uvicorn worker, Docling/torch (extract BackgroundTask) and FlashRank ONNX (`/ask` rerank) can run at the same time. Under RAM pressure the failure looks like “the app crashed” / 502 / Railway “Stopping Container”, but the root cause is peak RSS ≈ *sum* of both residents plus thread oversubscription (OpenBLAS/OMP).
**Fix direction:** (1) never load Docling for plain text, (2) serialize heavy ML with one process-wide semaphore, (3) shrink the reranker model and candidate pool, (4) pin native thread counts to 1. Degrade gracefully on ONNX failure; do not remove ADR-0008 stacks. Raising Railway RAM is ops fallback if still OOM after code mitigations.

### 2026-07-20 — 32-minute Railway FAILED deploys died on `image push`, not app startup
Deploy `3fb4e4ae…` (commit `85fc022`, Dockerfile builder, root `/backend`) built successfully — apt purge, pip install, flashrank + Docling model bake all completed — then log-spammed `image push` until the deploy failed (~32 minutes). Healthcheck never got a chance; the bottleneck is shipping a torch/docling-heavy image on the trial plan.
**Fix direction:** keep shrinking the image (CPU torch wheel, fewer baked models, multi-stage), or push less often / use a lighter “API-only” image for deploys and load models from a volume/cache. Do not debug as a `/health` or `$PORT` failure when build logs end in endless `image push`.

### 2026-07-20 — CORS variable set in Railway but live API still returns `Disallowed CORS origin`
`CORS_ORIGINS` on `Sage_v1` includes `https://sage-frontend-production.up.railway.app`, but a live OPTIONS preflight from that origin still returns `400` body `Disallowed CORS origin` (localhost origin returns `200`). Last SUCCESS deployment (`26a48a94…`) is still serving; later deploys all FAILED at image push, so the running container never restarted with the updated env.
**Fix:** `railway restart -s Sage_v1 -y` (reloads env without rebuild) or get a successful redeploy. Frontend *is* calling the backend (`NEXT_PUBLIC_API_URL` present in the JS bundle) — the browser blocks it at CORS.

### 2026-07-20 — `{"detail":"Not Found"}` at the bare root URL is expected, not a bug
Hitting `https://sagev1-production.up.railway.app/` (no path) returns `{"detail":"Not Found"}`. This is normal FastAPI behavior — `app/main.py` never registers a `/` route, only `/health`, `/ask`, `/auth/*`, `/files/*`, `/internal/*`. Confirmed via Railway logs: `GET /` 404s repeatedly right alongside `GET /health` 200s on the same healthy deployment.
**Don't debug this as a deploy failure** — check `/health` specifically before assuming the service is down.

### 2026-07-20 — CORS_ORIGINS unset on Railway defaults to `localhost:3000` only, breaks any other frontend origin as an unhelpful "Failed to fetch"
File upload from the local Next dev frontend against the freshly-shipped Railway backend failed with a bare `TypeError: Failed to fetch` (browser fetch's generic network-error message — no HTTP status, no server-side log entry) shown in the UI as `"<filename>: Failed to fetch"` (`frontend/src/hooks/use-file-library.ts`'s `uploadFailures.push`). Railway logs confirmed the `POST /files` never arrived — not a backend bug.
**Why:** `Settings.cors_origins` (`backend/app/config.py`) defaults to `"http://localhost:3000"` and `CORS_ORIGINS` was never set as a Railway variable. `POST /files` requires an `Authorization` header, which forces a CORS preflight; any frontend origin other than exactly `http://localhost:3000` (a Vercel URL, `127.0.0.1:3000` vs `localhost:3000`, etc.) gets silently blocked client-side with zero diagnostic info beyond "Failed to fetch".
**Fix:** set `CORS_ORIGINS` explicitly on Railway (`railway variables --set "CORS_ORIGINS=http://localhost:3000" --service Sage_v1`, comma-separated for multiple origins) to match whatever origin(s) the frontend is actually served from, and point `frontend/.env.local`'s `NEXT_PUBLIC_API_URL` at the Railway URL when testing the shipped backend locally. **Whenever a fetch fails with no status code and no server log entry for the request, suspect CORS before anything else** — it's indistinguishable from a network outage in browser JS. See [[Deployment-Notes#Secrets / config]].

### 2026-07-20 — Railway healthcheck 503 while Next.js is running
After fixing `$PORT`, healthcheck still failed for 5m with "service unavailable". Railway deploy logs showed `next start` / Next.js on `:8080`, not uvicorn — the service was still building the **frontend** while healthcheck hit FastAPI-only `/health`.
**Fix:** Root Directory = `backend`; deploy a branch that includes `backend/Dockerfile` + `backend/railway.toml`; set `DATABASE_URL` to Supabase. See [[Deployment-Notes]].

### 2026-07-19 — `NullPool` required for asyncpg + pytest-asyncio on Windows
Contract tests errored with `RuntimeError: Event loop is closed` / `AttributeError: 'NoneType' object has no attribute 'send'` on every test after the first, but only when they shared a module-level `create_async_engine()` singleton.
**Why:** pytest-asyncio (`asyncio_mode=auto`) gives each test function its own event loop on Windows (`ProactorEventLoop`). SQLAlchemy's default pool keeps asyncpg connections alive across tests; a connection opened under test 1's loop, then checked out again under test 2's (different) loop, tries to write through a transport tied to a closed loop.
**Fix:** `create_async_engine(url, poolclass=NullPool)` — opens a fresh connection every time instead of reusing one tied to a dead loop. See `backend/app/db.py`. This is specifically a Windows Proactor issue; Linux's default `SelectorEventLoop`-based setup is less prone to it but `NullPool` is still the standard safe choice for a test suite with per-test loops.

### 2026-07-19 — `passlib`'s bcrypt backend breaks with `bcrypt` 4.1+/5.x
`passlib.hash.bcrypt` raised `ValueError: password cannot be longer than 72 bytes` on a 4-character PIN. Not a real length issue — passlib's *internal* `detect_wrap_bug()` self-test hashes a long dummy secret to probe the bcrypt backend, and that self-test breaks because newer `bcrypt` removed the `__about__.__version__` attribute passlib's version-sniffing code expects.
**Why:** `passlib` (last released 2020) predates a `bcrypt` API change; the two are now incompatible out of the box on a fresh install.
**Fix:** call the `bcrypt` library directly (`bcrypt.hashpw`/`bcrypt.checkpw`) instead of going through `passlib.CryptContext`. See `backend/app/auth.py`. Don't add `passlib` to a new Python project's dependencies for password hashing — go straight to `bcrypt` (or `argon2-cffi`).

### 2026-07-19 — pydantic-ai's Gemini provider is `google`, not `google_gla`
Docs/blog examples from ~mid-2026 and earlier reference `pydantic_ai.providers.google_gla.GoogleGLAProvider`. The installed version (pydantic-ai-slim 2.13) has merged the GLA/Vertex split into one `pydantic_ai.providers.google.GoogleProvider(api_key=...)`.
**Fix:** when a pydantic-ai import 404s, check `pkgutil.iter_modules(pydantic_ai.providers.__path__)` for the current module name rather than trusting cached docs — this library's public surface moves fast. Model settings for disabling Gemini 2.5 "thinking" are similarly version-sensitive: current key is `GoogleModelSettings(google_thinking_config={"thinking_budget": 0, "include_thoughts": False})`.

### 2026-07-19 — Real Postgres + pgvector without Docker/WSL (Windows, non-elevated)
This dev environment has no Docker Desktop and no WSL, and installing either needs elevation this session doesn't have — so "just run `docker compose up`" wasn't available for the [[Retrieval-Contracts]] requirement of testing against real Postgres, never a mock.
**Fix:** downloaded EDB's zip-distribution Postgres 16 Windows binaries (not the installer — no admin needed) + a community-compiled `pgvector` DLL matched to the exact server version, ran `initdb`/`pg_ctl` as a plain user-mode process on a non-default port (55432). Full steps in `backend/.devdb/README.md`. `backend/docker-compose.yml` still exists as the real path for any machine that does have Docker — this workaround is purely local-machine-specific, not a project-wide pattern.

### 2026-07-19 — Alembic autogenerate doesn't import third-party column types
`alembic revision --autogenerate` emitted a migration referencing `pgvector.sqlalchemy.vector.VECTOR(dim=1536)` in the column definition but never added the corresponding `import` — the generated file would `NameError` on `alembic upgrade`.
**Why:** autogenerate renders the type's `repr()`-like path but only knows to auto-import from `sqlalchemy`/`sqlalchemy.dialects`, not arbitrary third-party packages.
**Fix:** always read a freshly autogenerated migration before running it. Added `from pgvector.sqlalchemy import Vector` manually and swapped in `Vector(1536)`; also had to add `op.execute('CREATE EXTENSION IF NOT EXISTS vector')` before the first `CREATE TABLE` that uses it — autogenerate has no concept of Postgres extensions at all.

### 2026-07-19 — `:root` after `.dark` cancels dark mode
`:root` and `.dark` both match `html.dark` at equal specificity `(0,1,0)`. If light `:root` tokens are declared after `.dark`, they always win — `classList.add("dark")` appears to do nothing.
**Fix:** declare dark tokens after light as `:root.dark` (higher specificity). Theme preference must also live in a root `ThemeProvider` so System listens to `prefers-color-scheme` on every route, not only inside Settings.

### 2026-07-19 — Dark tokens must preserve light elevation structure
Default shadcn dark sets `--background` darkest and `--muted` lighter. Sage shell uses `bg-muted` for the page well and `bg-background` for floating panels — so copying shadcn dark inverted the elevation (panels sank into the well).
**Fix:** in `.dark`, keep the same roles as light: muted = recessed well, background/card = elevated surfaces; bump `muted-foreground` for secondary-text contrast. Prefer semantic tokens over `bg-neutral-*` page wells.

### 2026-06-30 — Resize hit area vs 2px grid track
Putting `w-4` on a button inside a `0.125rem` grid column doesn't create a usable drag target — the column constrains layout width even if the button visually overflows.
**Fix:** keep grid track at 2px; absolutely position the `w-4` button centered over the track (`left-1/2 -translate-x-1/2`). See [[Reusable-Patterns#Resizable panel divider]].

### 2026-06-30 — Invalid Tailwind width class `w-3.3`
`w-3.3` is not a valid Tailwind class — resize hit area silently didn't apply.
**Fix:** use standard scale classes (`w-3`, `w-4`).

### 2026-06-30 — `min-h-screen` on columns below a header
Adding a top header + column sections with `min-h-screen` makes total height `header + 100vh`, causing unwanted page scroll.
**Fix:** outer shell owns `min-h-screen flex-col`; panel row gets `flex-1 min-h-0`; inner sections use `h-full` / `flex-1`, not `min-h-screen`.

### 2026-06-30 — Mixing px and % panel widths
Collapsing a panel to a fixed pixel width while computing middle width as `100 - left% - right%` breaks when units mix.
**Fix:** use CSS Grid with `1fr` for middle, or track visibility separately (`0px` when hidden, saved `%` when shown). See [[FEAT-app-shell-layout#Toggle behavior (visibility vs width)]].

### 2026-06-30 — Tooltip sizing drift
First tooltip implementation used `text-sm` + heavy padding — looked nothing like VS Code compact tooltips.
**Fix:** `text-[12px]`, `px-2.5 py-1.5`, `leading-none`, `shadow-md`. Sidebar toggles use side placement, not bottom. See [[UI-UX-Guidelines#Tooltips]].

### 2026-06-30 — One file is fine early; extract on boundaries
It's normal for `page.tsx` to hold the whole shell while exploring UI. Additive programming ≠ never split files — it means don't bake in rigid assumptions before you know the shape.
**Extract when:** responsibilities stabilize (header, resize hook, panel layout), not at an arbitrary line count. See [[Current-Context#Code organization philosophy]].

### 2026-07-03 — Global scrollbars when collapsing side panels
Collapsing the right panel caused viewport scrollbars (horizontal + vertical).
**Why:** (1) `min-h-screen` + header can exceed viewport if body margin isn't reset; (2) the 16px resize hit area (`w-4`) on a 2px grid track overflows past the grid edge when the adjacent panel column is `0px`.
**Fix:** lock shell to viewport (`html`/`body`/`main`: `h-full overflow-hidden`, `body { margin: 0 }`); hide resize divider columns (`0px` track + no handle) when their panel is collapsed; restore via header toggle. See [[Reusable-Patterns#Viewport-locked app shell]] and [[Reusable-Patterns#Resizable panel divider]].

### 2026-07-03 — Panel tooltips clipped at minimum resize width
At `MIN_SIDE_WIDTH = 12%`, long bottom tooltips (e.g. "Auto-reveal current file" on the left panel header) were cut off when the panel was dragged narrow.
**Why:** Panel sections use `overflow-hidden`; tooltips are `absolute` inside the panel, not portaled. Extra `z-index` does not escape overflow clipping.
**Fix:** raised `MIN_SIDE_WIDTH` to **16%** in `page.tsx` (was 14% in vault notes). **Also fixed (2026-07-07):** portaled tooltips escape `overflow-hidden` on panels — see [[Stacking-Contexts-and-Portals#Sage implementation]]. `MIN_SIDE_WIDTH` raise remains useful for toolbar layout at narrow widths.

### 2026-07-07 — Header tooltips hidden behind grid panels (stacking context)
Upload (and other header) tooltips had `z-50` but still painted **under** the left/right panel grid when the tooltip extended below the header.
**Why:** Browsers paint by **stacking context** (layer), not per-element z-index globally. The tooltip's `z-50` only wins against siblings **inside the header**. The grid is a **sibling** of the header — if the grid's layer is above the header's layer, the entire grid covers everything on the header, including high-z tooltips. Analogy: z-index on the tooltip is ink on "Header Paper"; it can't jump above "Panel Paper" unless you lift the whole header sheet or cut the tooltip out.
**Fix (2026-07-07):** Portaled all `HeaderIconButton` tooltips via shadcn/Base UI `Tooltip` (`TooltipPrimitive.Portal` in `frontend/src/components/ui/tooltip.tsx`). `variant="compact"` preserves VS Code black tooltip styling. `TooltipProvider` in `layout.tsx`. Supersedes the `relative z-20` on global `<header>` workaround — portal is the chosen long-term fix. See [[Stacking-Contexts-and-Portals#Sage implementation]].
**Related:** [[Lessons-Learned#2026-07-03 — Panel tooltips clipped at minimum resize width]] (overflow clipping — different mechanism). See [[Reusable-Patterns#HeaderIconButton (icon + compact tooltip)]].

### 2026-07-07 — React Hooks: `useState` and functional updaters
`useState` is a **Hook** (any `use*` function). `const [value, setValue] = useState(initial)` gives current state + updater. For toggles, prefer `setValue((current) => !current)` over `setValue(!value)` when next state depends on previous — functional form receives latest committed state and avoids stale reads under batching. Used in shell for `isLeftVisible`, `isRightVisible`, `isDark` in `page.tsx`. See [[Stacking-Contexts-and-Portals#React Hooks (related learning)]].

### 2026-07-07 — File upload abuse surface
Upload is Admin-only in MVP, but abuse still matters: stolen PIN on shared tablets, staff bypassing UI if API lacks role checks, cross-tenant `business_id` bugs, MIME/extension spoofing, zip-bomb PDFs/DOCX exhausting extraction, storage spam, filename path tricks, image pixel bombs, and **prompt injection** via document text (highest Sage-specific impact).
**Mitigation:** server-side Admin check; magic-byte + parse validation; UUID storage paths; extraction timeout + max text size; rate limits + per-business quota; reject `.svg` and legacy `.doc` in v1. See [[FEAT-file-upload#Security (must hold in FastAPI)]].

### 2026-07-07 — Legacy `.doc` rejected in v1 upload
Spec lists DOC + DOCX but stack only has `python-docx` (DOCX). Legacy `.doc` is a different binary format.
**Decision:** accept `.docx` only; reject `.doc` with clear message to save as DOCX. See [[FEAT-file-upload#Supported file types (v1 decision)]].

### 2026-07-19 — Supabase Storage rejects a valid service key without an `apikey` header
`SupabaseStorage.upload()` (`backend/app/files/storage.py`) sent only `Authorization: Bearer <service_key>` and got `403 Invalid Compact JWS` — even after swapping in a genuine `sb_secret_...` key and creating the missing bucket via the same key.
**Why:** Supabase's Storage REST API requires **both** `Authorization: Bearer <key>` **and** `apikey: <key>` headers. Missing `apikey` fails with a confusing JWS-format error that has nothing to do with the actual problem (looks like a malformed/expired token, not a missing header).
**Fix:** added `"apikey": service_key` alongside `Authorization` in `SupabaseStorage.__init__`. If you ever see "Invalid Compact JWS" from a Supabase REST call (Storage, PostgREST, etc.) with a key you've already verified is valid, check for a missing `apikey` header before assuming the key itself is wrong.
**Related gotcha, same debugging session:** Supabase's newer API key system has two formats — `sb_publishable_...` (client-safe, like the old anon key) and `sb_secret_...` (server-only, like the old service_role key). A `sb_publishable_...` key pasted into `SUPABASE_SERVICE_KEY` fails the same way (looks like an auth error, is actually a wrong-key-type error). Verify the prefix, not just that a value is present.

### 2026-07-19 — A system prompt's own citation example can bias the model away from the real format
Sage's agent (`backend/app/agent/sage_agent.py`) validates that every citation id the model returns exists in the assembled context (`app/retrieval/assemble.py`), where real ids look like `28867fcd076e454f99b200a081e52b71#0` (`{file_id}#{chunk_index}`). The system prompt's rule about citation formatting used an illustrative example, `"policy.pdf#0"` — a *filename*-shaped id, not the actual hex-id-shaped one the model was ever given in context. Roughly 1 in 3 real requests failed with `UnexpectedModelBehavior: Exceeded maximum output retries` because the model would substitute a nicer-looking filename-based citation instead of copying the real bracketed id from the context passage.
**Why:** LLMs pattern-match on few-shot-style examples in system prompts more readily than on abstract instructions. An example that *looks like* the target format but isn't the actual format is worse than no example.
**Fix:** changed the prompt's example to the real id shape and added an explicit "never substitute a filename... for it" instruction. When a system prompt gives a formatting example, that example must be drawn from (or structurally identical to) what the model will actually see at runtime — never a stand-in that merely illustrates the *idea*.

### 2026-07-19 — `tests/app/conftest.py`'s autouse `clean_db` truncates dev data, not just test data
Running any test under `backend/tests/app/` (even a single file) truncates `businesses`/`users`/`files`/etc. in whatever database `DATABASE_URL` points at — including the local dev Postgres instance (`sage_test` on port 55432), which is the same DB used for manual dev/browser testing, not a separate throwaway one.
**Why:** `clean_db` (`tests/app/conftest.py`) is `autouse=True` and calls `reset_db()`, which truncates every tenant table, before *and* after every test function — by design, so tests never see leftover state from a previous run. It has no way to know "this is someone's manual dev session, not a test run."
**Fix:** re-run `backend/scripts/seed_dev_business.py` after running the backend test suite if you need a working dev login again. If this friction becomes annoying, the real fix is a separate `DATABASE_URL` for the test suite vs. manual dev (e.g. a `sage_dev` DB alongside `sage_test`), not touching the autouse fixture.

### 2026-07-19 — OpenRouter needs an explicit `max_tokens` cap, and Gemini's free tier is 20 req/day
Two separate blockers hit wiring the agent's LLM call to a real key: (1) Google AI Studio's free tier caps `gemini-2.5-flash-lite` at **20 `generateContent` requests per day per project**, not a generous "flakiness" limit — a handful of manual test questions during citation-retry loops (each retry is a full extra model call) can exhaust it in minutes. (2) Routing the same model through OpenRouter (`google/gemini-2.5-flash-lite` via `pydantic_ai.providers.openrouter.OpenRouterProvider` + `OpenAIChatModel`) fixes the quota problem but defaults to requesting the model's full 65535-token output ceiling — which a low-balance OpenRouter key can't afford even for a two-sentence answer, failing with `402 Payment Required`.
**Fix:** pass `ModelSettings(max_tokens=2048)` (or similar) when building the OpenRouter-backed model — plenty for a grounded staff-facing answer, well under what a small credit balance affords. See `backend/app/agent/sage_agent.py::_build_agent`.
**Open issue, not resolved:** even past the 402, this specific OpenRouter route (Gemini + pydantic-ai's tool-call-based structured output) intermittently returns `finish_reason: "error"` or produces citations that fail validation — roughly 2 of 3 requests in one test session. Direct Google (`GoogleProvider`) was reliable in the same session, just quota-capped. `answer_question` (`backend/app/agent/answer.py`) now catches both `ModelHTTPError` and `UnexpectedModelBehavior` and degrades to a "temporarily unable to answer" response instead of a raw 500 either way — but the underlying OpenRouter reliability issue for this model + structured-output combination is unresolved. Added `openrouter_model` setting (`OPENROUTER_MODEL` env var) to override the model string for troubleshooting — e.g. `openrouter/auto` lets OpenRouter's meta-router pick instead of forcing `google/gemini-2.5-flash-lite`; still not 100% reliable (2 of 3 succeeded in one retest) and the model `auto` picks can differ answer-to-answer (one response embedded the raw `[file_id#chunk]` citation bracket directly in the prose instead of leaving it out of the visible answer text, unlike direct Gemini). See [[Known-Issues]].

### 2026-07-19 — A model will substitute a document's own section numbers for a numeric citation id — prompting alone didn't fix it, changing the id format did
Citation ids were `f"{file_id}#{chunk_index}"` — e.g. `28867fcd076e454f99b200a081e52b71#0`. A test document had "Section 5: Employee Discount" living inside chunk `#0`. Every single attempt (0/5 clean, across multiple sessions and both the direct-Google and OpenRouter paths) cited `#5` instead of the real `#0` when asked about the discount — the model was substituting the document's own "Section 5" heading for the citation's chunk index, because both are small salient integers near each other in context. Adding an explicit, unambiguous system-prompt instruction ("section numbers... are NEVER part of the citation id") **did not change the model's behavior at all** — still 0/3 clean on a fresh test immediately after the prompt change.
**Why prompting failed:** small, fast models (Flash-Lite class, thinking disabled) pattern-match on salient numbers in context more readily than they follow meta-instructions about which number to use. Telling the model "don't do X" doesn't help when X is the path of least resistance for next-token prediction — the fix has to remove the confusable pattern from the input, not add more words asking the model to resist it.
**Fix:** changed `citation_id()` (`backend/app/retrieval/assemble.py`) from a bare integer suffix to a 6-hex-char hash of `(file_id, chunk_index)`. A hash bears no resemblance to a section number, so there's nothing left to confuse it with. Confirmed 6/6 clean afterward, same question, same document. **Lesson: when a model keeps making the same "obviously wrong per the instructions" mistake despite an explicit prompt fix, suspect the input format is creating an attractive-but-wrong pattern to match — changing the format is often more reliable than adding more emphatic instructions.** This is the second citation-related bug in one session caused by a plausible-but-wrong number/string being available for the model to grab (see the filename-vs-hex-id entry above) — a pattern worth watching for generally: anything in context that "looks like" the expected output format but isn't the actual value is a bug magnet.

### 2026-07-19 — `evaluate_trust` averaging all retrieved hits let padding dilute a perfect match below threshold
`retrieve()` (`backend/app/retrieval/retriever.py`) always returns up to `top_k=8` hits, padding with whatever's left in the candidate pool once genuinely relevant chunks run out — by design, since it's a generic retrieval chokepoint, not a relevance filter. `evaluate_trust`'s `score_hits()` computed the **mean** of all of those scores. With one document in the business, all 8 (or fewer) hits come from the same short doc and tend to be reasonably relevant, so the mean looked fine in testing (`test_trust.py` only ever ingests one doc). The moment a *second*, unrelated document existed, most padding hits scored near-zero, and averaging them with one excellent match (0.98) produced a trust score far under the 0.35 threshold — a **false refusal** on a question the retrieval had actually answered correctly.
**Why this hid so well:** it's invisible with a single-document business (the common case in early manual testing) and only appears once retrieval has more candidates to pad with — exactly the shape a real pilot store's file library would have.
**Fix:** `score_hits()` now takes `max(scores)` instead of the mean — "is there at least one trustworthy passage," not "was everything retrieved relevant on average." The agent's own citation validation already ensures irrelevant padding chunks never get cited even when they're in context, so gating on the top score doesn't risk ungrounded answers. Matches what the `FallbackEvent.top_score` column name always implied the intended metric was.
**Lesson:** a trust/quality gate tested only against the smallest possible input (one file, one relevant chunk) can hide a scoring-methodology bug that only appears at slightly more realistic scale. Test refusal/trust logic with at least two documents — one relevant, one not — not just one.

### 2026-07-28 — Inverse tab fillets (“curl backs”) were a Chrome illusion, then removed by design
Preview-tab chrome briefly used `::before`/`::after` + `box-shadow` scoops at the bottom corners so the active tab looked cut into the strip the way Chrome does. The effect is easy to misread as a bug (“why does it curl back?”) and cost a lot of layout constraints (`margin-inline ≥ curve`, no ancestor `overflow-hidden`, reserved bottom band so scoops don’t paint onto the stage). After shortening tabs to `h-9`, the product call was to drop the scoops entirely: sides meet the strip line square; only the top `border-radius` remains.
**Related:** [[FEAT-preview-tabs]]

### 2026-07-28 — Chrome-style inverse tab fillets get clipped when margin < curve or an ancestor uses overflow:hidden
Preview-tab active chrome uses `::before`/`::after` + `box-shadow` to fake concave bottom corners (see `frontend/src/components/preview-tabs/preview-tab-chrome.css`). The scoops sit *outside* the tab border box at `±--preview-tab-curve`. Two easy ways to erase them: (1) `margin-inline` smaller than the curve — fillets spill into neighbors/clippers; (2) a parent `overflow-hidden` (common flex `min-w-0` companion) — clips anything painted outside the padding edge.
**Fix:** set `margin-inline: var(--preview-tab-curve)`, size the shadow offset with the same token, keep the strip/tablist `overflow-visible`, and avoid `overflow-hidden` on ancestors of shaped tabs (lanes may still `overflow-x-auto` for scroll — accept edge clipping there or pad the scrollport).
**Related:** [[FEAT-preview-tabs]], panel tooltip overflow clipping lesson above.

### 2026-07-28 — Same inverse tab fillets: correct math, still invisible, because the tab was flush with the strip's own bottom edge
Even with margins and overflow fixed (entry above), the active tab's bottom corners still showed no scoop. Isolated the CSS in a standalone HTML file with high-contrast colors (`chromium`/Playwright, since no project run-skill existed — see [[Reusable-Patterns]] for the driver pattern) and confirmed the `::before`/`::after` + `box-shadow` math paints a geometrically correct concave notch — but it lands **below** the tab's own border box (`bottom:0` + `box-shadow` offset `(curve, curve)` shifts the shadow's Y range to `[tabBottom, tabBottom+curve]`, not `[tabBottom-curve, tabBottom]`). Because `.preview-tab-shaped` was `height:100%` (flush with the strip header's own bottom edge, by design, so the active tab visually bridges into the stage with no gap), that "below the tab" region *is* the stage, not the strip — and the stage shares the exact same `--background` token as the active tab. The notch was painting perfectly, just onto a surface the same color as the thing it was supposed to look like it was cut out of, so it was optically invisible while still being present in computed styles.
**Why prompting/margin fixes alone couldn't catch this:** `getComputedStyle` on the pseudo-element showed a real, non-`none` `box-shadow` with the right color and offset the whole time — nothing was "wrong" in isolation, so a DOM/CSS inspection without an actual rendered screenshot comparison would say everything checks out. Only a visual diff (isolated repro with two contrasting colors above/below the strip line) revealed the notch was landing on the wrong side of the boundary.
**Fix:** leave a real `curve`-tall band of strip background under the tab (what the fillet bleeds into) and bridge it with `box-shadow: 0 var(--preview-tab-curve) 0 0 var(--tab-chrome-bg)` so the tab still reads flush with the stage except in the side gutters. First pass used `height: calc(100% - curve)` (near-full header). That made the label float high in an oversized chrome; later pass uses fixed `height: 2.25rem` (`h-9`, same as inactive) + `align-self: flex-end` + `margin-bottom: var(--preview-tab-curve)` so active/inactive/settings share one baseline and the top radius sits in the strip well instead of dominating the header. Inactive tabs use the same `self-end` + bottom margin (not bare `self-end`, which would flush to the strip edge and reintroduce this bug).
**General rule: a CSS effect that paints "just past" an element's box only reads correctly if what's on the other side of that boundary is the color the effect assumes it is.** Verify with an actual rendered screenshot at high contrast, not just `getComputedStyle` — the styles can be 100% correct and the effect can still be invisible because of what's painted underneath.
**Tooling note:** this environment had no project skill for running the frontend visually and no `chromium-cli`; `npm install --no-save playwright-core && npx playwright install chromium` worked (network was available despite an initial `npx` prompt failure) and is the fallback path per the `run` skill's `examples/playwright.md`. A temp diagnostic Next.js route must **not** be prefixed with `_` (App Router treats `_`-prefixed folders as private and 404s them).

### 2026-08-04 — Docling's `TableItem.export_to_dataframe()` silently returns `"<!-- rich cell -->"` placeholders without a `doc=` argument
`app/ingestion/extract.py` called `table.export_to_dataframe()` (no args) to linearize docx tables for chunking. Any cell Docling classifies as "rich" (a hyperlink, merged cell, formatted run — common in real docx pricing tables) is a `RichTableCell`, whose `_get_text()` needs the parent `DoclingDocument` to resolve its content via markdown serialization; without it, it silently returns the literal string `"<!-- rich cell -->"` instead of raising or warning loudly (there IS a `_logger.warning("...deprecated...")` but it's easy to miss in background-task logs, and the method still "succeeds" and returns a DataFrame — nothing fails loudly). This corrupted both the header row and cell values for any table with rich-formatted cells, and the same missing-context bug meant our own separate `_linearize_table` sentence-pass duplicated content already present in `doc.export_to_text()`'s native `|`-table serialization (tables are included there by default — `DOCUMENT_TOKENS_EXPORT_LABELS` includes `DocItemLabel.TABLE`).
**Fix:** pass `doc=doc` to `export_to_dataframe(doc=doc)` (resolves rich cells correctly), and exclude `DocItemLabel.TABLE` from `doc.export_to_text(labels=...)` so tables appear exactly once (via our own linearization), not twice. Also added a *separate* `doc.export_to_markdown()` export (stored in a new `files.preview_markdown` column, human-preview-only, never chunked) since Docling's markdown export already renders real tables/headings and doesn't have this problem — no doc= needed there since it's a method on `doc` itself.
**Lesson: an "optional" `doc` parameter on a Docling export method that only logs a deprecation warning when omitted is not actually optional if the source has any non-plain-text cells — verify against a real-world docx (merged cells, hyperlinks, formatted headers), not a synthetic simple table, before trusting an extraction helper's default path.**

### 2026-07-29 — React 19: `useEffect(() => setMounted(true))` for portals is flagged
The classic "mount portal only on client" pattern (`useState(false)` + `useEffect` → `setMounted(true)`) now trips `react-hooks/set-state-in-effect` in React 19 / eslint-config-next: synchronous setState in an effect causes an extra render cascade.
**Fix:** `useSyncExternalStore(() => () => {}, () => true, () => false)` — server snapshot `false`, client snapshot `true`, no effect, no setState. Applied in `toast-provider.tsx`.
**Related:** [[UI-UX-Guidelines#Toasts (application-owned)]]
