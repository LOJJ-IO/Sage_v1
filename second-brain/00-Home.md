---
type: index
status: active
tags: []
created: 2026-07-01
updated: 2026-07-03
related: []
---

# Sage — Home

Entry point for both humans and AI agents. Start here, then follow links.

## Right now

- [[Current-Context]] — active work, open questions, what Claude should know before touching this repo today
- [[Roadmap]] — where we're headed
- [[Sprint-Log]] — what shipped recently

## Engineering MOC

- [[Architecture-Overview]] — system design, how the pieces fit
- [[Tech-Stack]] — languages, frameworks, infra, why each was chosen
- [[Database-Schema]] — current schema, ownership, migration notes
- [[API-Documentation]] — endpoints, contracts, auth
- [[Coding-Standards]] — how we write code here
- [[Known-Issues]] — current bugs/limitations not yet fixed
- [[Lessons-Learned]] — postmortems and non-obvious gotchas
- [[Reusable-Patterns]] — code patterns worth copying instead of reinventing
- [[Troubleshooting]] — "when X breaks, do Y"
- [[Performance-Notes]] — known bottlenecks, benchmarks, optimization history
- [[Deployment-Notes]] — how releases go out, environments, rollback
- [[Useful-Commands]] — commands worth not re-googling
- [[Prompt-Library]] — reusable prompts for Claude/Cursor on this repo
- Architecture Decisions → [[Architecture/Decisions]] folder, chronological ADRs
- Bugs → [[Engineering/Bugs]] folder, one file per bug

## Product MOC

- [[Product-Vision]] — why this product exists, who it's for
- [[Workspace-UI-Design-Decisions]] — **workspace UX decision log** (zero-states, tabs, hotel-staff constraints) — read before UX work
- [[UI-UX-Guidelines]] — design principles, component conventions
- [[Customer-Feedback]] — what users are telling us
- Feature specs → [[Product/Features]] folder

## Research & Meetings

- [[Research]] folder — spikes, comparisons, external investigation
- [[Meetings]] folder — decisions and notes from syncs

## Logs

- [[Daily]] folder — one note per working day
- [[Weekly]] folder — weekly rollups

---

### For AI agents reading this first

If you're Claude Code or Cursor starting a task in this repo:

1. Read [[Current-Context]] — it's the highest-signal, most current file in the vault.
2. If the task touches **workspace UX** (zero-states, tabs, panels, dock, AI copy), read [[Workspace-UI-Design-Decisions]] before proposing changes.
3. If the task touches architecture, check [[Architecture-Overview]] and the relevant [[Architecture/Decisions|ADR]] before proposing a new approach — a past decision may already explain why the "obvious" solution was rejected.
4. If the task touches a known bug or pattern, check [[Known-Issues]] / [[Reusable-Patterns]] first.
5. When you finish non-trivial work, write back: update [[Current-Context]], add/update a bug or ADR or feature spec, and append a line to today's [[Daily]] note.
