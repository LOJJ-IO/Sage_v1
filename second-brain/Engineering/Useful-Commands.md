---
type: commands
status: active
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Tech-Stack]]"]
---

# Useful Commands

Commands worth not re-googling or re-deriving. Keep it to non-obvious/project-specific ones — skip generic `git status`-tier commands.

## Frontend (`frontend/`)
```bash
npm run dev     # start dev server, localhost:3000
npm run build   # production build
npm run start   # run production build
npm run lint    # eslint
```

## Backend (`backend/`)
*(none yet — fill in once backend exists)*

## Repo-wide
```bash
# nothing project-specific yet
```

## Claude Code skills installed in this repo
- **`humanizer`** (`.claude/skills/humanizer/SKILL.md`, installed 2026-08-23 from [blader/humanizer](https://github.com/blader/humanizer), MIT) — rewrites AI-sounding prose to read naturally against 35 patterns from Wikipedia's "Signs of AI writing" (filler, hedging, chatbot artifacts, inflated claims, forced groups of three, etc.), without inventing facts or touching code/data/frontmatter. Invoke with `/humanizer` or "humanize this text." **User directive it exists to serve:** all user-facing error copy in the app must be short and non-technical (see [[UI-UX-Guidelines#Toasts (application-owned)]] "Error copy rule") — run any new or rewritten error string through this skill before it ships, on top of keeping it short. Installed as a project-scoped skill (copied `SKILL.md` in, not via `/plugin marketplace add`) — confirmed live immediately in the same session, no restart needed.
