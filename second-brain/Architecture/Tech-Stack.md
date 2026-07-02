---
type: architecture
status: active
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Architecture-Overview]]"]
---

# Tech Stack

## Frontend (`frontend/`)
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 16 (App Router) | Bootstrapped via `create-next-app` |
| UI library | React 19 | |
| Styling | Tailwind CSS 4 | via `@tailwindcss/postcss` |
| Icons | `@tabler/icons-react`, `@vscode/codicons` | codicons used for VSCode-style side-panel buttons |
| Language | TypeScript 5 | |
| Lint | ESLint 9 (`eslint-config-next`) | |

## Backend (`backend/`)
Not yet started. Fill in once chosen; open decision tracked in [[Current-Context]]. When decided, write an ADR in [[Architecture/Decisions]] covering: language/framework, why it was chosen over alternatives, and how it deploys.

## Data store
TBD — not yet decided.

## Infra / deployment
TBD — see [[Deployment-Notes]] once environments exist.

## Why this file exists
So Claude never has to re-derive the stack from `package.json` diffing across sessions, and so version bumps/replacements are visible at a glance. Update this table whenever a dependency is added/removed/swapped for something architecturally significant (not every patch bump — routine version bumps belong in commit history, not here).
