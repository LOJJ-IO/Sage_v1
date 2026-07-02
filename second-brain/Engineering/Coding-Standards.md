---
type: standards
status: active
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Tech-Stack]]", "[[Reusable-Patterns]]"]
---

# Coding Standards

How we write code here — the things worth stating once so they're not re-explained or re-argued every session. Keep this to conventions that aren't already enforced by lint/format tooling (don't restate what ESLint already catches).

## General
- TypeScript strict where the project config allows it — don't loosen `tsconfig.json` without an ADR.
- Prefer editing existing files/patterns over introducing new abstractions — see [[Reusable-Patterns]] before writing something new.

## Frontend (`frontend/`)
- Next.js App Router conventions — components under `src/app/`.
- Tailwind for styling (see [[UI-UX-Guidelines]]) — avoid inline styles except for values that must be computed at runtime (e.g. drag-resize widths).
- Icons: codicons for VSCode-style chrome, tabler-icons elsewhere — don't introduce a third icon set without discussion.

## Backend
TBD — fill in once `backend/` exists.

## Commit / PR conventions
<!-- Fill in if the team has one (conventional commits, PR template, etc.) -->

## When to update this file
When a convention is decided that should hold across the codebase, not just in one PR — and when you notice yourself explaining the same convention to Claude twice.
