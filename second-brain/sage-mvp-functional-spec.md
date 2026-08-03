# Sage MVP — Functional Specification

| | |
|---|---|
| **Status** | Approved for implementation |
| **Version** | 1.0 |
| **Last updated** | 2026-07-06 |
| **Owner** | Ronald (LOJJ-IO) |
| **Location** | `second-brain/Product/Sage-MVP-Functional-Spec.md` (canonical; this root copy is a mirror) |

**Product:** Sage (flagship AI manager / help desk feature of LOJJ.IO)
**Target pilot:** Boutique retail (e.g. cosmetics shop, mall outlet)
**Purpose of this document:** Full functional scope for MVP, written so Cursor, Claude Code, or a human engineer can implement directly from it. No ambiguity should remain after reading this top to bottom.

---

## 0. Relationship to Prior Sage Decisions (read first if you've seen earlier second-brain docs)

This spec **supersedes the market framing** in earlier Sage documents but **does not replace the long-term product vision**:

- **Market pivot:** earlier Sage work targeted *hotel operations*. The MVP beachhead is now **boutique retail** (high staff turnover, decentralized knowledge, faster sales cycle). The underlying value proposition — centralized operational knowledge queryable by any staff member — is unchanged; hospitality remains a future market, not an abandoned one.
- **Workspace-shell vision deferred, not dropped:** prior sessions established Sage's long-term architecture as a modular workspace shell (dock of connected third-party apps, panels as slots, Cursor-style tab groups in the center stage). **None of that is in MVP scope.** This spec's three-column layout is the simplest expression of the shell; the dock/tabs/app-slot system remains the post-MVP direction.
- **Open conflict to resolve — settings entry point:** an earlier UI session decided the bottom-left avatar becomes a clickable account menu; this spec places profile/themes/Manage Accounts under a top-right gear icon (Section 4.2, item 11). These need one owner. *Current working resolution: gear icon owns settings (themes, Manage Accounts); avatar menu owns identity actions (who am I, log out). Revisit during frontend build.*

---

## 1. Product Summary

Sage centralizes a business's operational knowledge (SOPs, training docs, policies, product catalogs, etc.) so any staff member can ask questions and get answers sourced from that knowledge base — regardless of experience level or shift. It solves the problem of inconsistent service quality caused by knowledge living in a few experienced employees' heads or scattered documents.

The interface has three regions:
- **Left column** — file tree / knowledge base manager
- **Middle column** — file preview / stage
- **Right column** — "Ask Sage" chat panel

---

## 2. Stack & Infrastructure

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js / React | Existing choice, unchanged |
| Backend | FastAPI (Python) | Chosen because team already knows Python well; easier debugging |
| Hosting | Railway (frontend **and** backend) | Originally considered splitting Vercel (frontend) + Railway (backend), but decided to put the **whole app on Railway** for simplicity |
| Database | Supabase (PostgreSQL) | Used **only** as managed PostgreSQL — see 2.1 |
| File storage | Supabase Storage | Used as a dumb blob store, accessed **only via the backend** — see 2.1 |
| AI agent layer | **VoltAgent** (open-source TypeScript framework) running as a dedicated internal microservice | Owns the Sage agent only: model abstraction, retrieval interface, guardrails, conversation memory, observability. See Section 7.8 for the integration contract |
| LLM provider | **Not fixed to Anthropic** — evaluate on cost/quality. Gemini 2.5 Flash Lite currently looks like the strongest cost option for MVP query volume (see Section 7.3 for numbers). Decision should be revisited as real usage data comes in, not locked in prematurely |

**Full-scale (post-MVP) infrastructure note:** Railway likely stays; Convex or Supabase are both still on the table for the database/storage layer at scale.

### 2.1 Architecture principle: the backend owns everything

Supabase is used **only for what it's exceptionally good at**: PostgreSQL, backups, replication, and database management. Everything else goes through the FastAPI backend.

```
Frontend
   ↓
Railway Backend (FastAPI)
   ↓                      ↓
Supabase              VoltAgent AI service
(PostgreSQL + Storage)   (internal-only) → LLM provider
```

The backend owns:
- authentication flow
- authorization
- business logic
- AI orchestration (delegated to the VoltAgent service, but **only reachable through FastAPI** — see 7.8)
- payment handling (future)
- notifications (future)
- integrations (future)
- validation

**Hard rules that follow from this:**
- The frontend **never** talks to Supabase directly — no Supabase client SDK in the frontend, no anon/service keys shipped to the browser.
- Supabase Auth is **not used** (it's built for email/OAuth/magic-link flows we explicitly ruled out; our username+PIN model with primary-admin rules lives in FastAPI).
- Supabase Row Level Security is **not** the permission system — all authorization is FastAPI middleware. (Two permission systems to keep in sync is a liability at this scale.)
- Supabase Storage is accessed exclusively through backend endpoints — FastAPI proxies all uploads/downloads and enforces role checks before touching storage.
- Supabase's auto-generated REST APIs and realtime subscriptions are unused (auto-CRUD would bypass permission logic; Sage has no realtime collaboration features).

**Payoff:** one chokepoint for all rules, and Supabase stays a swappable managed-Postgres provider — migrating to Convex/RDS/anything later is a connection-string change, not a re-architecture.

---

## 3. Authentication

### 3.1 MVP flow
Retail staff typically do **not** have company email addresses, so email/magic-link auth was ruled out (can't guarantee the staff can open a link sent to their personal phone on the store's computer).

**Chosen approach: Username + PIN**
- Manager (or whoever holds admin-level control — see Section 3.3 on roles) creates each staff account manually.
- Manager sets a **username** (should be easy to remember; can be written down without much risk) and a **temporary PIN**.
- Staff logs in with username + temporary PIN on the store's computer.
- On first login, staff is **required** to change their PIN before proceeding.
- After that, they log in normally with username + their own PIN going forward.

### 3.2 Modular auth design (important architectural requirement)
Auth must **not** be hardcoded to username+PIN. Build it behind an abstraction/interface so a manager or enterprise customer can later plug in a different auth implementation (SSO, LDAP, OAuth, custom system) without touching core Sage logic. Treat username+PIN as the **default implementation** of a swappable auth interface, not the only possible one.

### 3.3 Roles
For now, **manager and supervisor are functionally identical** — treat them as a single role representing "the person who controls everything" (uploading, deleting, replacing files, editing tags, creating staff accounts). Do not build separate permission tiers for manager vs. supervisor at this stage. Just two roles total for MVP:
- **Admin (manager/supervisor combined)** — full control over the shared knowledge base and staff accounts
- **Staff** — read/query access to the knowledge base; full control over their own personal workspace (layout, folders, bookmarks, theme)

### 3.4 Account Creation & Sign-In Flow

#### 3.4.1 Regular sign-in
A single sign-in screen serves everyone — staff and admins alike. Username + PIN fields, "Sign In" button (PIN entry styled like a numeric keypad, since this runs on a shared store computer, not a personal device). There is no separate "admin login" — the account's role is already known once authenticated, and the UI simply renders differently afterward based on that role.

#### 3.4.2 Bootstrapping the first (primary) admin
There is no public "sign up as admin" page anywhere in the app — that would let anyone attempt to create an admin account for a business they don't own. Instead, when LOJJ onboards a new customer, **LOJJ creates that business's first admin account directly** (via an internal LOJJ tool or direct action), the same way an admin creates a staff account. The business owner/manager is handed a username + temporary PIN as part of onboarding and changes their PIN on first login, same flow as staff.

This first admin account is the **primary admin** and has a special protection (see 3.4.5).

#### 3.4.3 Admins creating additional accounts
Once logged in, an admin sees a **"Manage Accounts"** option under the gear icon (not visible to staff). This opens a list of existing accounts (username, role badge, created date, kebab menu for reset PIN / deactivate) plus an **"+ Add Account"** button.

Add Account modal fields:
- Username
- Temporary PIN
- **"Grant admin privileges"** toggle — off by default, so creating a second admin is never the accidental default path

#### 3.4.4 Confirming admin privilege grants
If the "Grant admin privileges" toggle is switched on, the admin performing the action must **re-enter their own PIN** to confirm before the account is created. This avoids introducing a separate shared master key (another secret that inevitably leaks) while still preventing admin creation from being a single careless click.

#### 3.4.5 Primary admin protection
The **primary admin account** (the one LOJJ created during onboarding, per 3.4.2) can **never have its admin privileges revoked or be deactivated** by any other admin. This guarantees a business always retains one guaranteed, un-demotable admin, and prevents subsequently created admins from being able to "overthrow" the original manager/owner by revoking their access.

#### 3.4.6 Resetting PINs & deactivating accounts
- **Reset PIN (admin action, via kebab in Manage Accounts):** sets a new temporary PIN; that account is forced through the change-PIN flow on next login, exactly like a first login.
- **Deactivate (admin action):** a deactivated account can no longer sign in, but its data (preferences, bookmarks, chat history) is retained, so reactivating restores everything. Accounts are deactivated rather than hard-deleted in MVP (avoids cascade complications and preserves audit trail). The primary admin cannot be deactivated.

#### 3.4.7 UI shape, concretely
- **Sign-in screen:** centered card, username field, PIN field (keypad-style), "Sign In" button.
- **Manage Accounts screen:** table/list view — username, role badge, created date, kebab menu (reset PIN / deactivate — deactivate disabled for the primary admin), "+ Add Account" button top-right.
- **Add Account modal:** username field, temporary PIN field, admin-privilege toggle, and a "confirm your PIN" field that only appears when that toggle is switched on.

### 3.5 Auth mechanics & PIN security *(defaults chosen for implementability — override if desired)*
- **Sessions:** JWT issued on login, held by the frontend, sent with every request. Token expiry aligned with the 30-minute inactivity timeout (Section 12.2): short-lived access token refreshed on activity; no activity for 30 minutes → session dead, back to sign-in.
- **PIN storage:** PINs are hashed (bcrypt or argon2) — never stored plaintext. Same treatment as passwords.
- **PIN length:** 4–6 digits, staff-chosen at first login.
- **Brute-force protection (required, not optional):** a 4-digit PIN has only 10,000 combinations, so rate limiting is essential. After **20 failed attempts** on a username, lock that account for **15 minutes** (an admin can also unlock/reset via Manage Accounts). Failed-attempt counter resets on successful login. (20 is deliberately forgiving for genuinely forgetful staff while still capping brute-force throughput at a useless rate — ~80 guesses/hour against 10,000 combinations.)
- **Multi-tenancy note:** usernames are unique **per business**, not globally (see Section 9) — two different stores can each have a "maria".

---

## 4. File Management (Left Column)

### 4.1 Supported file types
MVP: **PDF, DOC, DOCX, images**
Also supported since easily previewable: **TXT, MD**, and similar plain-text formats.

*(Default assumption: max upload size 25 MB per file — large enough for any realistic handbook/catalog PDF, small enough to keep upload handling simple. Adjust if a pilot customer's docs demand it.)*

### 4.2 Toolbar (top of left column) — left to right
1. **Collapse/toggle left sidebar** — hides the entire left column (file tree)
2. **Files button** — resets the left column view back to the current folder/file arrangement (personal arrangement or auto-grouped, whichever is active)
3. **Search icon** — searches files. **MVP scope: filename search only** (not file contents — content search adds complexity/cost not justified yet)
4. **Upload button** — restricted to Admins only. Adds new files to the shared knowledge base.
5. **Bookmarks button** — shows the current user's bookmarked files (per-profile, see Section 6)

Second row:
6. **Sort** — options include A–Z, Z–A, file name, file type, date added (date *modified* sorting is out of scope for MVP). Also includes a special **"Manager" sort option** — selecting it shows the shared/admin-defined arrangement instead of the user's personal one. Clearing the sort returns to the user's personal arrangement.
7. **New folder** — available to **all users** (not just Admins). Lets any user create folders to organize *their own view* of the file tree (see Section 4.4 — this is local/personal, not a change to the shared knowledge base).
8. **Wand (auto-group)** — see Section 4.5
9. **Eye with question mark ("What am I looking at?")** — reveals/highlights whatever file is currently open in the middle preview pane within the file tree (does not summarize or review the file's content)
10. **Fold/unfold** — collapses all folders to their simplest view (same pattern as Cursor, Obsidian, etc.)
11. **Gear icon (replaces old dark/light mode toggle)** — opens profile view and theme settings (see Section 6); admins additionally see "Manage Accounts" here (Section 3.4.3)

### 4.3 File-level actions (kebab menu)
Hovering over a file (or folder) reveals a **kebab (⋮) menu** to its far right with:
- Delete
- Replace
- Edit tags/keywords
(Admin-only actions)

A **bookmark toggle** sits next to the kebab (or inside its menu) — click to bookmark, click again to unbookmark (label changes to "Remove bookmark" once bookmarked).

### 4.4 Personal file organization
Any user (not just Admins) can create folders and rearrange files **in their own view**. This is **purely local/visual reorganization** — it does not change the underlying shared knowledge base or what Sage retrieves from. It only changes how that individual sees and navigates their file tree.

Because arrangement is drag-and-drop, **ordering must persist** — personal folders and their contents carry a `position` value so the arrangement reloads exactly as the user left it (see schema, Section 9).

### 4.5 Auto-group ("Wand") tool
**MVP behavior:** Groups files into folders based on **filename similarity** (string/keyword matching — e.g., files with "training," "policy," "product" in the name cluster together).

**Scope of effect:** the wand writes to the **user's personal arrangement only** (it creates/rearranges personal folders). It never alters the shared/admin structure. *(Post-MVP possibility: an admin-only "apply to shared arrangement" variant.)*

**Post-MVP / full-scope vision:** Expand grouping logic to also consider:
- File content (not just filename)
- Whether files were uploaded together as a folder (implies pre-existing relatedness)
- The name of the source folder, if uploaded as one
- Any other available metadata/context from the upload

**Conflict handling:** If a user has already manually rearranged their personal view and then runs the wand, show a modal asking:
> "Auto-group folderless files only, or everything (this will overwrite your current arrangement)?"

This prevents the wand from silently destroying manual work.

### 4.6 Upload pipeline (what happens on upload)
When an Admin uploads a file, the backend:
1. Validates type + size, checks role.
2. Stores the raw file in Supabase Storage (via backend only — Section 2.1).
3. **Extracts text immediately** (PDF/DOCX/TXT/MD → plain text) and stores it in `files.extracted_text`. This is the text sent to the LLM at query time — extraction happens **once at upload**, never per-query. (Python: `pypdf`/`pdfplumber` for PDF, `python-docx` for DOCX.)
4. Runs filename-based auto-tag extraction (Section 5.2); if nothing usable, forces manual tags (Section 5.3).
5. Creates the `files` row (tags, folder placement, extracted text, storage path).

**Images:** stored and previewable, but they have no extractable text — their contribution to Sage's retrieval is via **tags and filename only**. (Multimodal image understanding is out of scope for MVP.)

**Duplicate filenames:** allowed (files are identified by id, not name), but the upload UI should warn "A file with this name already exists — replace it instead?" to nudge admins toward Replace when that's what they mean.

### 4.7 Replace & delete semantics
- **Replace:** swaps the stored file and re-runs text extraction, but **everything else about the file survives** — same file id, tags/keywords, bookmarks, and personal-folder placements all carry over untouched. `created_at` is retained; this is "new version of the same document," not "new document." **Replace exists precisely because in-app document editing is out of MVP scope** — swapping in an updated version of a file is the MVP's answer to "I need to change what this document says."
- **Delete:** the file is **simply gone** — the file row and stored blob are removed, along with anything referencing it (bookmarks pointing at it, personal-folder placements of it). Chat history is **not** rewritten — past conversations keep their recorded `files_used` references (the file just no longer exists to open). Deletion prompts a confirm dialog stating the file will disappear from everyone's views and bookmarks.

### 4.8 Middle column: file preview
- **PDF** — rendered natively in the browser (iframe/embed or PDF.js).
- **Images** — rendered inline.
- **TXT / MD** — rendered as text (MD rendered as formatted markdown).
- **DOC / DOCX** — *(MVP default: render the extracted text, clearly labeled "text preview.")* Pixel-faithful DOCX rendering in-browser requires a conversion step (e.g. LibreOffice → PDF at upload); that's a post-MVP polish item unless a pilot customer's docs make it essential.

---

## 5. Tagging System (Powers Sage's Retrieval)

### 5.1 Why tags exist
Tags are the mechanism that lets Sage know which files are relevant to a given question, without sending the entire knowledge base to the LLM on every query (cost control — see Sections 7.2–7.3).

### 5.2 Auto-tag generation
When a file is uploaded, the system **always** attempts to auto-generate tags from the filename (e.g., "employee_training_manual.pdf" → tags: "employee," "training," "manual"). This happens **regardless of whether the Admin engages with tagging at all** — tagging must not be a blocking or mandatory step in the upload flow.

- Admin can review/approve suggested tags, or ignore them entirely and just upload.
- A small textbox should be available near the suggested tags for manually adding/editing tags if desired.
- Full content-based tag suggestion (reading the file's actual contents to generate tags) is considered **overkill for MVP** — filename-based extraction only.

### 5.3 Handling poorly-named files (edge case)
If filename-based tag extraction produces nothing usable (e.g., a file literally named `1316251631.docx`), the system must **force** the Admin to manually add at least one or two tags before the upload can complete. Show a modal: *"We couldn't auto-tag this file. Add a few keywords so Sage knows what it is."*

This edge case should be rare — well-named corporate documents are the norm — but must be handled so every file in the system has *some* tag coverage.

### 5.4 Editing tags after upload
Done via the kebab menu on the file (see Section 4.3) — "Edit tags/keywords."

---

## 6. User Profiles & Personalization

Every account stores, persisted server-side (not just client-side):

- **Theme** selection (multiple themes planned; gear icon opens theme settings)
- **Layout/workspace configuration** — sidebar width, column layout, any other UI micro-state
- **Personal folder structure** (Section 4.4)
- **Bookmarks** (Section 4.3) — different staff may care about different files; bookmarking lets them find "their" files quickly
- **Chat history with Sage** — staff can revisit past conversations (see 7.5 for the UI)

**Why persist all of this:** Explicit product goal — give staff a sense of ownership over their workspace even though MVP scope is otherwise limited. This is considered close to core functionality, not a nice-to-have, because a well-organized, personalized workspace is part of why someone would use Sage over their existing scattered documents.

**Scale note:** This data is small (a few KB of JSON per user even with lots of micro-state). Not a storage concern at any realistic MVP or near-term scale. Practical implementation notes:
- Store all workspace/UI state as a single JSON blob per user (one preferences record) rather than many small rows — minimizes round trips.
- **Debounce** frequent UI state changes (e.g., dragging to resize the sidebar) and batch-save every few seconds or on app close/blur, rather than writing to the DB on every pixel of movement.

---

## 7. Sage Chat Behavior (Right Column)

### 7.1 Reference UX pattern
The desired interaction flow closely mirrors a reference example observed in another product's help-desk assistant (Ferndesk), which shows, in order:
1. **"Searched for"** — the actual query terms used to search
2. **"Found N articles"** — a collapsible list of matched source documents/files
3. The **AI-generated answer**, with a small numbered citation marker referencing which found article(s) support each part of the answer

This transparency (showing what was searched, what was found, before showing the answer) is the target UX for Sage's chat — staff should be able to see which internal docs an answer came from, not just receive a black-box response.

### 7.2 Retrieval logic (cost-driven design decision)
Several approaches were evaluated:

| Approach | Verdict |
|---|---|
| Send **all files** to the LLM on every query | Rejected — too expensive at any real scale, "AI cost can be quite deadly" |
| Single ever-growing "mega file" of all extracted text, sent in full each query | Rejected as primary approach — cost grows unbounded as knowledge base grows, since full content is resent every query |
| **Vector database / embeddings (RAG)** | Most cost-effective **long-term**, but more complex to set up (chunking, embedding generation, pgvector or similar). Worth adopting once keyword filtering proves insufficient. Supabase's built-in pgvector is the natural fit since Supabase is already in the stack. |
| **Keyword/tag-based filtering (chosen for MVP)** | Match query keywords against file tags (Section 5) to narrow down which files are relevant, then send only those matched files to the LLM. Simple, cheap, no embedding infrastructure needed. Good enough until real usage data shows it's insufficient. |

**MVP decision: keyword/tag-based filtering.** Vector search is the clear upgrade path once query volume or knowledge-base size makes keyword matching too imprecise.

**Matching mechanics (MVP default):** tokenize the user's question, drop stopwords, then match remaining terms (case-insensitive, simple stemming optional) against each file's tags **and filename tokens**. Rank files by number of matched terms; send the top matches' `extracted_text` to the LLM. Cap the context sent per query (e.g. top 3–5 files or a token budget) so a broad question can't accidentally pull the whole knowledge base.

### 7.3 LLM provider selection
Do **not** assume Anthropic/Claude by default — evaluate on real cost numbers. Example comparison run for a boutique doing ~100 queries/day (~3,000/month) at ~7,500 tokens per query:

| Provider/Model | Est. monthly cost (input+output) |
|---|---|
| Claude Sonnet | ~$67.50/month |
| OpenAI GPT-4o Mini | ~$7.43/month |
| **Google Gemini 2.5 Flash Lite** | **~$3.72/month** |
| Self-hosted open-source model (e.g. Llama, Mistral) on Railway | ~$20–50/month compute, no per-token cost, but weaker reasoning quality and added infra complexity — not justified at MVP scale |

**Current leaning: Gemini 2.5 Flash Lite for MVP** based on cost, pending a decision. This is not locked in — revisit if quality proves inadequate. Whatever model is chosen, wrap the LLM call behind an abstraction so swapping providers later doesn't require rearchitecting.

### 7.4 Zero-match fallback
If keyword matching finds **no** relevant files, do **not** silently answer from the LLM's general knowledge (that's how confident wrong answers about *this specific store's* policies happen). Instead, Sage **asks the user to point it in the right direction**: it responds along the lines of *"I couldn't find anything matching that in your documents. Can you point me to a folder or file I should check?"* and lets the user suggest one or more folders/files (via a picker in the chat panel or by naming them). Sage then runs the query against the suggested files' `extracted_text` directly, bypassing keyword matching. The "Found 0 articles" state is shown honestly in the 7.1 UX before the prompt. *(Post-MVP option: additionally allow a clearly-labeled general-knowledge answer as a last resort.)*

**Fallback event logging (required):** every zero-match fallback is logged — the question asked plus which file(s) the user ultimately pointed Sage to (see `fallback_events` in Section 9). This is free, self-generating telemetry: each event is direct evidence that a document's tags are missing a term staff actually use. It produces (a) a ready-made list of tags admins should add, and (b) the exact data needed to judge when keyword matching should be upgraded to vector search.

### 7.5 Chat history access (UI)
A **small clock icon** (same pattern as Cursor's chat history) sits in the chat panel and opens the user's list of past conversations (most recent first, titled by first question). Selecting one reloads it read-only or continues it. Backed by the `chat_history` table — per-user, cross-device (Section 12.7).

### 7.6 Cost safeguard
A simple per-user daily query cap (default: **100 queries/user/day**, configurable) protects against runaway API costs from a stuck client, abuse, or a curious staff member spamming. Hitting the cap shows a friendly "you've hit today's limit" message. This is a backend guard, cheap to implement, and prevents the one failure mode that could turn a $4/month bill into a $400 one.

### 7.7 System prompt requirements
Answer quality lives or dies on the system prompt sent with every query. Whatever LLM is chosen, the prompt **must** enforce:

1. **Grounding:** answer **only** from the provided documents. If the documents don't cover the question, say so plainly (e.g. *"The documents I have don't cover this — check with your manager"*) — never improvise from general knowledge, even when it would probably be right. A confidently wrong answer about *this store's* policy is worse than no answer.
2. **Citations:** every claim in the answer must reference which provided document supports it (e.g. numbered markers keyed to the matched-files list) — this is what powers the citation UX in 7.1. The backend should pass documents to the LLM with stable indices/labels so citations map cleanly back to files.
3. **Audience & tone:** answers are for retail floor staff mid-shift — concise, plain language, actionable. No corporate hedging, no walls of text.
4. **Conflict handling:** if two provided documents contradict each other, say so and cite both rather than silently picking one.

The exact prompt text is an implementation detail, but these four behaviors are **requirements** — they should be verified with test queries before any pilot, not left to whatever the model does by default.

### 7.8 VoltAgent integration (AI layer implementation)

The Sage agent itself is built with **VoltAgent** (free, open-source, TypeScript — `@voltagent/core`), running as a **dedicated internal microservice** on Railway. It is never exposed to the frontend; only FastAPI can call it.

**Why a separate service (honest tradeoff):** VoltAgent is TypeScript-only, and the backend is deliberately Python. Rather than abandon FastAPI or skip the framework, the AI layer is isolated into a small Node service. The blast radius is contained: the service has exactly one job (run the Sage agent), a thin API surface, and no direct user access. What VoltAgent buys in exchange:
- The **model abstraction Section 7.3 requires** comes free — models are provider-prefixed strings (`google/gemini-2.5-flash-lite` → any other provider is a one-line change).
- The **retriever abstraction makes the 7.2 upgrade path real** — retrieval sits behind a `BaseRetriever` class; swapping keyword filtering for pgvector later changes the retriever, not the agent.
- **Guardrails turn Section 7.7 from prompt hopes into enforced code** — input/output interceptors that can allow, modify, or block at runtime.
- Built-in **observability** (traced agent runs, guardrail actions, retrieval results) and an **evals** framework for pre-pilot verification.

**Concrete integration contract:**

1. **Service:** `sage-agent` — Node/TypeScript Railway service using `@voltagent/core` + `@voltagent/server-hono`. Reachable only via internal networking; every request must carry a shared service token (env var on both services). No public route.
2. **Agent definition:** one `Agent` named `sage`, instructions implementing the four Section 7.7 requirements (grounding, citations, floor-staff tone, conflict handling), model set from an env var (default `google/gemini-2.5-flash-lite`).
3. **Retriever:** a custom `KeywordRetriever extends BaseRetriever` that calls back into FastAPI's internal endpoint `POST /internal/retrieve` (service-token auth), which runs the Section 7.2 keyword/tag matching and returns the matched files' `extracted_text` + stable citation indices. Matched sources are pushed into VoltAgent's `context` so the response can carry the 7.1 sources list. **All data access stays in FastAPI** — the VoltAgent service never touches Postgres or Storage directly, preserving 2.1 and tenancy scoping. When vector search arrives, `/internal/retrieve` changes internally; the retriever and agent don't.
4. **Guardrails:**
   - *Input guardrail:* reject empty/whitespace queries and enforce a max input length before any model call (cheap cost/abuse protection in front of 7.6's daily cap).
   - *Output guardrail:* verify the answer carries citation markers mapping to the provided sources when sources were provided; if the retrieval context was empty, verify the answer is the 7.4 fallback ask rather than an improvised answer. Violations → block and return the safe fallback message.
5. **Request flow:** `POST /sage/query` (FastAPI) → authenticates user, checks daily cap, forwards `{question, business_id, user_id, conversation_id, suggested_file_ids?}` to `sage-agent` → VoltAgent runs retriever (via FastAPI) → guardrails → LLM → returns `{searched_for, matched_files, answer, citations}` → FastAPI writes `chat_history` (and `fallback_events` when applicable) and responds to the frontend. **FastAPI remains the only writer to the database.**
6. **Conversation continuity:** pass `userId`/`conversationId` through to VoltAgent so follow-up questions in one conversation retain context. `chat_history` in our Postgres stays the canonical record (written by FastAPI); VoltAgent's memory is operational, not the source of truth.
7. **Pre-pilot verification:** use VoltAgent's evals/observability to run a fixed test-query suite asserting the 7.7 behaviors (grounded answers, citations present, honest "not covered" responses, contradiction surfacing) before any store pilot.

**Build-order note:** stand up `sage-agent` early (it's ~1 file to start: agent + server), stub `/internal/retrieve` with hardcoded docs, and develop the FastAPI side against it — the two services can be built in parallel.

---

## 8. Pricing Consideration (business, not engineering — included for context)

At ~$3.72–$70/month in LLM cost per boutique (depending on model choice), a SaaS price in the range of $19–49/month (cost-plus) or higher if value-based pricing is validated through direct customer discovery. This is not finalized and should be treated as a business/sales question, not an engineering constraint — but it directly motivates why cheap retrieval (Section 7.2) and a cheap LLM (Section 7.3) matter for MVP margins.

---

## 9. Database Schema (Draft)

### Tenancy
Sage is multi-tenant from day one: every business (store) is isolated. Even with a single pilot customer, `business_id` scoping costs nothing now and avoids a painful retrofit later. **Every query in the backend is scoped by the authenticated user's `business_id` — no cross-tenant reads, ever.**

```
businesses (
  id, name, created_at
)
```

### Users & shared knowledge base (per business)
```
users (
  id, business_id, username, pin_hash, role,
  is_primary_admin, is_active,
  must_change_pin, failed_attempts, locked_until,
  created_at
)
-- username unique per business_id (not globally)
-- must_change_pin: true after account creation or admin PIN reset
-- failed_attempts / locked_until: brute-force lockout (Section 3.5)

files (
  id, business_id, filename, storage_path, file_type,
  uploaded_by (user_id), auto_tags, approved_tags,
  extracted_text, folder_id, created_at
)
-- extracted_text: populated once at upload (Section 4.6); what the LLM receives
-- storage_path: location in Supabase Storage (raw bytes), backend-access only

folders (
  id, business_id, name, parent_folder_id, position, created_by
)
```

### Per-user / personal workspace
```
user_preferences (
  id, user_id, theme,
  layout_config_json, updated_at
)

user_personal_folders (
  id, user_id, folder_name, parent_folder_id, position
)

user_personal_folder_contents (
  user_id, personal_folder_id, file_id, position
)
-- position columns persist drag-and-drop ordering (Section 4.4)

bookmarks (
  id, user_id, file_id
)

chat_history (
  id, user_id, query, response,
  files_used_json, created_at
)

fallback_events (
  id, user_id, query, suggested_file_ids_json, created_at
)
-- logged on every zero-match fallback (Section 7.4): the question that matched
-- nothing + which file(s) the user pointed Sage to. Feeds tag improvements and
-- the keyword-vs-vector-search decision.
```

**Key principle:** shared knowledge base tables (files, folders, tags) are Admin-controlled and visible to everyone in the same business the same way. A file belongs to exactly one shared folder at a time (`files.folder_id`); `folders.parent_folder_id` allows nesting folders within folders. Personal workspace tables (user_preferences, user_personal_folders, bookmarks, chat_history) are per-user and never affect what other users see or what Sage retrieves from.

---

## 10. API Surface (Draft Route Map)

All routes require a valid JWT except sign-in. All routes are automatically scoped to the caller's `business_id`. "Admin" = admin-role check enforced in middleware.

**Auth**
- `POST /auth/login` — username + PIN → JWT (or "must change PIN" response)
- `POST /auth/change-pin` — first-login / post-reset PIN change
- `POST /auth/logout`

**Accounts (Admin)**
- `GET  /accounts` — list accounts
- `POST /accounts` — create account (PIN re-entry required in payload if granting admin — Section 3.4.4)
- `POST /accounts/{id}/reset-pin`
- `POST /accounts/{id}/deactivate` / `POST /accounts/{id}/reactivate` — blocked for primary admin

**Files**
- `GET    /files` — list files + shared folder structure
- `GET    /files/{id}` — metadata
- `GET    /files/{id}/download` — raw file (proxied from storage)
- `GET    /files/{id}/preview` — preview payload (PDF stream / extracted text per Section 4.8)
- `POST   /files` — upload (Admin; runs pipeline in Section 4.6; returns suggested tags)
- `PUT    /files/{id}/replace` — replace file, keep id (Admin)
- `PUT    /files/{id}/tags` — edit tags (Admin)
- `DELETE /files/{id}` — delete + cascades (Admin)
- `GET    /files/search?q=` — filename search

**Shared folders (Admin)**
- `POST /folders`, `PUT /folders/{id}`, `DELETE /folders/{id}` — manage shared structure

**Personal workspace**
- `GET/PUT /me/preferences` — theme + layout JSON (PUT is the debounced batch-save)
- `GET/POST/PUT/DELETE /me/folders` — personal folders + arrangement (incl. positions)
- `POST /me/autogroup` — run the wand against caller's personal arrangement
- `GET/POST/DELETE /me/bookmarks`

**Sage**
- `POST /sage/query` — question (+ optional user-suggested file/folder ids for the 7.4 fallback) → { searched_for, matched_files, answer } (7.1 shape); FastAPI authenticates + enforces daily cap (7.6), then delegates generation to the VoltAgent service (7.8); logs to chat_history
- `GET  /sage/history` — list past conversations
- `GET  /sage/history/{id}` — one conversation

**Internal (service-to-service only, shared-token auth — never exposed publicly)**
- `POST /internal/retrieve` — called by the VoltAgent service's retriever: `{question, business_id, suggested_file_ids?}` → matched files' extracted_text + citation indices (Section 7.8, item 3)

**Ops note:** three Railway services — frontend, FastAPI backend, and the `sage-agent` VoltAgent service (7.8). Frontend↔backend: either serve both behind one domain (path routing) or configure CORS on FastAPI for the frontend's origin. The `sage-agent` service is internal-only (Railway private networking + shared service token). LLM API keys, DB credentials, and the service token live in Railway environment variables, never in the repo or frontend.

---

## 11. Open Items / Not Yet Decided

- Final LLM provider choice (leaning Gemini 2.5 Flash Lite, not locked)
- Exact pricing model for pilot customers
- Whether/when to introduce vector search (pgvector via Supabase) to replace keyword filtering
- Full-scale hosting decision beyond Railway (Convex vs. Supabase for storage/DB at scale)
- Content-based (not just filename-based) auto-grouping and tagging — explicitly deferred past MVP
- Whether VoltAgent's conversation memory should eventually back multi-turn context beyond the MVP passthrough (currently: chat_history in our Postgres is canonical, VoltAgent memory is operational only — Section 7.8)
- DOCX pixel-faithful preview (conversion pipeline) vs. text preview — MVP defaults to text preview (Section 4.8)
- Whether Sage may fall back to general-knowledge answers when no documents match (MVP: no — Section 7.4)

---

## 12. Device & Environment Assumptions

These assumptions shape the frontend/UX decisions and should be treated as design constraints, not afterthoughts.

### 12.1 Shared device, not personal
Store computers/tablets are **not** assigned to a specific staff member — any employee may log into any device during a shift. This is why the username+PIN model (Section 3) doesn't rely on device-level identity at all; every session must authenticate independently.

### 12.2 Session timeout
To prevent one staff member's session being used by someone else after they step away (e.g. a break), Sage sessions **auto-log-out after 30 minutes of inactivity**. This assumes infrequent-but-real usage patterns (e.g. an employee stepping away for a 30-minute break) rather than constant, second-by-second interaction.

### 12.3 Internet dependency
Sage requires an active Wi-Fi/internet connection to function — there is no offline mode planned for MVP. If the store's connection drops, Sage is simply unavailable until it's restored. No local caching or offline fallback is in scope.

### 12.4 Device & browser landscape (informs frontend support target)
Boutique retail predominantly runs **tablet POS** — overwhelmingly iPads, with Android tablets as the secondary option — rather than fixed desktop terminals (which are more common in higher-volume environments like supermarkets or pharmacies). Since modern tablet POS is largely cloud-based and browser- or app-driven, these devices run current-generation iPadOS or Android and are capable of a full modern mobile browser (Safari or Chrome) — not a stripped-down embedded browser. **Sage's frontend does not need to support legacy or embedded browsers**; targeting modern Safari (iOS/iPadOS) and Chrome (Android) covers the realistic device landscape.

### 12.5 Screen size
Given iPad's dominance in this space, expect screen sizes in the **10.2"–12.9" diagonal range** for iPad, or roughly **8"–11"** for Android tablets — browser viewport widths typically fall between ~768px (portrait, smaller tablet) and ~1366px (landscape, larger iPad Pro). The current three-column layout (file tree / preview / chat) is expected to hold up reasonably well on this range, especially in landscape orientation. **Smaller tablets in portrait orientation are the main risk zone** for the three-column layout feeling cramped — a responsive fallback (e.g., collapsing to two columns or a tabbed view) is worth planning for, even if not built for MVP.

**Touch note:** since the primary devices are touchscreens, hover-only affordances (e.g. the kebab menu appearing on hover — Section 4.3) need a touch equivalent: the kebab should be always-visible or revealed on tap/long-press on touch devices.

### 12.6 Device may be shared with other software (e.g. POS/cashier app)
Whether a store dedicates a device to Sage or runs it alongside existing cashier/POS software is expected to be **case-by-case per business**. Ideally, staff can switch between Sage (as a browser tab or app) and their existing POS/cashier software on the same terminal without friction. No specific technical solution (e.g. kiosk mode, split-screen) is locked in for MVP — this should be revisited per customer during onboarding based on their existing hardware setup.

### 12.7 Preferences follow the user, not the device
Since all user preferences (theme, layout, bookmarks, personal folders — Section 6) are stored server-side, a staff member's personalized workspace loads correctly regardless of which store device/terminal they log into. This holds even in stores with multiple computers/registers.

### 12.8 Username vs. PIN security model
**Usernames are treated as low-risk if known** (e.g., can reasonably be written on a sticky note near a register) — they're an identifier, not a secret. **PINs are the actual security boundary** and must be easy for the individual staff member to remember, but are personal and not meant to be shared or displayed physically. This distinction is why usernames can be manager-assigned and casually visible, while PINs are staff-chosen (after the required first-login change) and expected to stay private. Brute-force lockout (Section 3.5) is what makes a short PIN an acceptable security boundary.

---

## 13. Explicitly Out of Scope for MVP

- File content search (filename search only)
- Date-modified sorting (date-added only)
- Separate manager vs. supervisor permission tiers (treated as one role)
- Vector embeddings / RAG pipeline (keyword/tag filtering only)
- Content-based auto-tagging or auto-grouping (filename-based only)
- Personal folder arrangement affecting Sage's actual retrieval (it's visual-only)
- Multimodal image understanding (images retrievable by tags/filename only)
- Pixel-faithful DOCX preview (text preview for MVP)
- Offline mode / local caching
- Sage answering from general knowledge when no documents match
