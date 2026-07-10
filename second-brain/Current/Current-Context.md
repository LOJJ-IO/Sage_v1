---
type: context
status: active
tags: [area/backend, area/frontend, area/product, priority/high]
created: 2026-07-01
updated: 2026-07-09
related: ["[[Roadmap]]", "[[Architecture-Overview]]", "[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]", "[[FEAT-sign-in]]", "[[FEAT-manage-team]]", "[[FEAT-app-shell-layout]]", "[[FEAT-file-upload]]", "[[UI-UX-Guidelines]]", "[[BUG-0001-ui-inconsistencies]]", "[[Workspace-UI-Design-Decisions]]", "[[Stacking-Contexts-and-Portals]]"]
---

# Current Context

**Read this first.** This file should always reflect *right now* — overwrite stale sections, don't append forever.

## Where the project is

Sage MVP functional spec is **approved for implementation** — [[Sage-MVP-Functional-Spec]] / [[FEAT-sage-mvp]]. Target: boutique retail pilot (cosmetics, mall outlet). Backend stack decided (FastAPI + Supabase + VoltAgent + Railway) — see [[Architecture-Overview]] and ADRs [[0001-fastapi-python-backend]]–[[0007-boutique-retail-mvp-beachhead]].

`frontend/` is a Next.js 16 / React 19 UI shell (three-column layout) — mostly placeholder, no backend wired. `backend/` and `sage-agent/` are empty — **implementation not started**.

**Next step:** use the spec to plan and build backend + full functionality.

## Active work

- **File upload** — [[FEAT-file-upload]] in progress (in-memory UI prototype); FastAPI pipeline next
- **MVP implementation planning** — backend, auth, files, Sage chat per [[Sage-MVP-Functional-Spec]]
- **Frontend alignment** — existing shell partially matches MVP layout; reconcile with spec (gear settings, auth screens, file tree, chat UX). Workspace-shell features (dock, tabs) are **out of MVP scope**.
- **Open UI conflict:** gear (settings) vs avatar (account menu) — working resolution in spec §0; finalize during frontend build.

## What's built (UI only)

| Area | Status |
|---|---|
| Three-column resizable layout | Done |
| Panel headers (left + right), icons, resize, toggle | Done |
| Theme / dark mode | Removed — light-only UI for now |
| Empty states (left + right panels) | Done (placeholder) |
| File upload (in-memory UI prototype) | In progress — [[FEAT-file-upload]] |
| File tree / preview / real chat | Not started |
| Auth screens | Sign-in at `/sign-in` ([[FEAT-sign-in]]); manage team at `/manage-team` ([[FEAT-manage-team]]); change-PIN + route guards not started |
| Backend / sage-agent | Not started |

Full UI inventory + bugs: [[BUG-0001-ui-inconsistencies]].

## Architecture (decided — not built)

| Component          | Choice                    | ADR                                     |
| ------------------ | ------------------------- | --------------------------------------- |
| Backend            | FastAPI (Python)          | [[0001-fastapi-python-backend]]         |
| Database + storage | Supabase (backend-only)   | [[0002-supabase-postgres-backend-only]] |
| Hosting            | Railway (3 services)      | [[0003-railway-hosting-all-services]]   |
| Auth               | Username + PIN (modular)  | [[0004-username-pin-modular-auth]]      |
| AI agent           | VoltAgent microservice    | [[0005-voltagent-ai-microservice]]      |
| Retrieval          | Keyword/tags (not vector) | [[0006-keyword-retrieval-mvp]]          |
| Market             | Boutique retail MVP       | [[0007-boutique-retail-mvp-beachhead]]  |

Schema: [[Database-Schema]]. API: [[API-Documentation]].

## Open questions (from spec)

Tracked in [[Sage-MVP-Functional-Spec#11. Open Items / Not Yet Decided]]:
- Final LLM provider (leaning Gemini 2.5 Flash Lite)
- Pilot pricing
- When to adopt pgvector
- Gear vs avatar settings (working resolution documented)

## What NOT to re-explain to Claude

- **Full MVP scope:** [[Sage-MVP-Functional-Spec]] — don't re-derive from chat.
- **Stack decisions:** [[Tech-Stack]] + ADRs — backend is FastAPI, not TBD.
- **Post-MVP workspace vision:** [[Workspace-UI-Design-Decisions]] — dock/tabs deferred.
- **UI shell details:** [[FEAT-app-shell-layout]], [[UI-UX-Guidelines]], icon libraries (Tabler + Codicons).

## Recently changed

- **2026-07-09** — Light-only UI: removed theme boot script, `lib/theme`, `use-theme`, Appearance menu, `.dark` tokens/`dark:` classes. Manage team: fixed back Codicon, role chips (active=admin style, inactive=muted+strikethrough), Badge `twMerge`. Primary `Button` soft texture (pill, gradient, shadow).
- **2026-07-08** — Manage team page at `/manage-team`: account list, add-account modal, reset PIN, deactivate/reactivate, primary-admin protection. See [[FEAT-manage-team]].
- **2026-07-07** — Sign-in page at `/sign-in`: centered card, username field, touch keypad PIN entry, API-ready `login()` stub. See [[FEAT-sign-in]].
- **2026-07-07** — [[FEAT-file-upload]] simplified to in-memory `File` state (no Next.js API/disk); validation rules kept in `file-upload.ts`.
- **2026-07-07** — Portaled all shell tooltips: shadcn/Base UI `Tooltip` + `variant="compact"` on `HeaderIconButton`; `TooltipProvider` in `layout.tsx`. See [[Stacking-Contexts-and-Portals#Sage implementation]], [[Reusable-Patterns#HeaderIconButton (icon + compact tooltip)]].
- **2026-07-07** — Documented header tooltip stacking-context bug + React Hooks learnings in [[Stacking-Contexts-and-Portals]], [[Lessons-Learned#2026-07-07 — Header tooltips hidden behind grid panels (stacking context)]].
- **2026-07-06** — Left panel header: replaced fold/unfold toggle with `codicon-collapse-all` ("Collapse all"); removed `isFolded` state. See [[Workspace-UI-Design-Decisions#4. Iconography — collapse-all]].
- **2026-07-06** — MVP functional spec ingested into second-brain: [[Sage-MVP-Functional-Spec]], [[FEAT-sage-mvp]], 7 ADRs, updated [[Architecture-Overview]], [[Database-Schema]], [[API-Documentation]], [[Product-Vision]], [[Roadmap]].
- **2026-07-03** — [[Workspace-UI-Design-Decisions]] logged; shell chrome token migration. See [[Daily/2026-07-03]].

---
*Update whenever priorities shift. Delete stale lines rather than leaving them.*
