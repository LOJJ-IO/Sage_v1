---
type: product
status: draft
tags: []
created: 2026-07-01
updated: 2026-07-03
related: ["[[Roadmap]]", "[[Workspace-UI-Design-Decisions]]"]
---

# Product Vision

This is the MOC for [[Product/Features|Features]] and the thing every feature spec should trace back to. Detailed workspace UX decisions: [[Workspace-UI-Design-Decisions]].

## Problem

Hotel front-desk staff need a **workspace** that stays open all shift — file tree, center stage for docs and apps, and AI — without training videos or documentation. Knowledge walks out the door with turnover; the product must be guessable on first use.

## Who it's for

- **Front-desk staff** — interruption-driven, shared workstations, minimal training, PMS muscle memory (Opera-tolerant, speed-sensitive).
- **Night audit** — alone at 3am, often least-trained; high-value AI user when no manager is available.
- **Multi-property groups** (future) — property/team switching in account UI.

## Non-goals

- Not a standalone document viewer — it's a **workspace shell** with dockable apps and tabs.
- Not optimized for power-user tab hygiene — tab cap and simple navigation by design.
- Replace-on-drag that closes open files when an app is dragged in — **rejected** (see [[Workspace-UI-Design-Decisions#3. Apps in the workspace — tabs vs. replace]]).

## Success looks like

- Zero-state guides a coherent first-run flow across all three panels.
- Workspace restores tabs and layout on reopen (persistence model TBD: per-login vs. per-desk).
- Demoable on a sales call without prospect upload (seed sample SOP).
- Staff can resume after interruption with zero re-orientation (tabs + persistence).
