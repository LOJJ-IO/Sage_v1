---
type: decision
status: under-reconsideration
tags: [area/product]
created: 2026-07-06
updated: 2026-08-23
related: ["[[Sage-MVP-Functional-Spec]]", "[[Product-Vision]]", "[[Workspace-UI-Design-Decisions]]", "[[Current-Context]]", "[[Customer-Feedback]]"]
---

# ADR-0007: Boutique retail as MVP beachhead (hotel deferred)

## Status
`under-reconsideration` as of 2026-08-23 — user: "our MVP targets may or may NOT be retail stores. Honestly, probably not. It could be an NGO of about 2-50 people or a medium sized manufacturing scaleup." Not yet superseded because a specific replacement beachhead isn't locked (two candidates floated, not chosen between) — see [[Current-Context]] for the live state. **Do not treat "boutique retail" as the current target until this is resolved**; this ADR stays as the historical record of the reasoning that produced it, per vault convention (supersede, don't edit history) once a new beachhead is actually chosen. Also newly relevant: [[Customer-Feedback#2026-08-23 — prospect/discovery call (handwritten notes, transcribed)]] surfaced a prospect call with roles (CEO, "Head doctor," Founder/Pastor, manager) that reads as neither retail nor obviously NGO/manufacturing — worth folding into whichever beachhead conversation happens next.

Previously (2026-07-06): `active` — supersedes hotel-first market framing in prior product docs

## Context
Earlier Sage work targeted hotel operations and a modular workspace shell (dock, tabs, app slots). MVP needs a faster sales cycle and a focused feature set. Boutique retail shares the core problem: decentralized operational knowledge and high staff turnover.

## Decision
MVP **beachhead market: boutique retail** (e.g. cosmetics shop, mall outlet).

MVP **product scope:** three-column layout (file tree / preview / Ask Sage chat) — the simplest expression of the shell. **Not in MVP:** dock, Cursor-style tabs, connected third-party apps, workspace-shell app slots.

Hospitality remains a **future market**, not abandoned. Long-term workspace-shell vision is **deferred, not dropped**.

## Alternatives considered
- **Hotel-first MVP** — superseded; slower sales cycle for initial pilot.
- **Full workspace shell in MVP** — deferred; three-column layout ships first.

## Consequences
- [[Product-Vision]] and [[Workspace-UI-Design-Decisions]] remain valid for post-MVP direction; read [[Sage-MVP-Functional-Spec#0. Relationship to Prior Sage Decisions]] before implementing.
- Device assumptions shift to tablet POS (iPad/Android) on shared store computers — see spec Section 12.
- Open UI conflict: gear icon vs. avatar for settings — working resolution in spec Section 0.

## Related
- Full product summary: [[Sage-MVP-Functional-Spec#1. Product Summary]]
- Prior workspace UX: [[Workspace-UI-Design-Decisions]]
