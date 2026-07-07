---
type: architecture
status: active
tags: [area/backend, area/frontend, area/infra]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Architecture-Overview]]", "[[Sage-MVP-Functional-Spec]]", "[[Deployment-Notes]]"]
---

# Tech Stack

Full MVP detail: [[Sage-MVP-Functional-Spec#2. Stack & Infrastructure]].

## Frontend (`frontend/`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Bootstrapped via `create-next-app` |
| UI library | React 19 | |
| Styling | Tailwind CSS 4 | via `@tailwindcss/postcss` |
| Icons | `@tabler/icons-react`, `@vscode/codicons` | codicons for VSCode-style side-panel buttons |
| Language | TypeScript 5 | |
| Lint | ESLint 9 (`eslint-config-next`) | |
| Hosting | Railway | See [[0003-railway-hosting-all-services]] |

**MVP constraint:** no Supabase client SDK in frontend — all data via FastAPI.

## Backend (`backend/`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI (Python) | [[0001-fastapi-python-backend]] |
| Auth | Username + PIN (JWT sessions) | Modular interface; see [[0004-username-pin-modular-auth]] |
| Text extraction | `pypdf`/`pdfplumber`, `python-docx` | At upload time → `files.extracted_text` |
| Hosting | Railway | |

## AI layer (`sage-agent/`)

| Layer | Choice | Notes |
|---|---|---|
| Framework | VoltAgent (`@voltagent/core`, `@voltagent/server-hono`) | TypeScript microservice |
| LLM | Env-configured; leaning **Gemini 2.5 Flash Lite** | Not locked — model abstraction required |
| Retrieval (MVP) | Keyword/tag via FastAPI `/internal/retrieve` | [[0006-keyword-retrieval-mvp]] |
| Hosting | Railway (internal-only) | Shared service token with FastAPI |

## Data store

| Layer | Choice | Notes |
|---|---|---|
| Database | Supabase PostgreSQL | Managed Postgres only; FastAPI connects directly |
| File storage | Supabase Storage | Blob store; backend proxies all access |
| Vector search | Not in MVP | pgvector upgrade path when keyword matching insufficient |

## Infra / deployment

| Layer | Choice | Notes |
|---|---|---|
| Platform | Railway | Frontend + FastAPI + sage-agent (3 services) |
| External | Supabase | Postgres + Storage |
| Secrets | Railway env vars | LLM keys, DB creds, service token — never in repo |

Post-MVP scale: Railway likely stays; Convex vs Supabase TBD for DB/storage at scale.

## Why this file exists
So Claude never has to re-derive the stack from `package.json` diffing across sessions, and so version bumps/replacements are visible at a glance. Update this table whenever a dependency is added/removed/swapped for something architecturally significant.
