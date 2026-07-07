---
type: product
status: active
tags: [area/product]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Roadmap]]", "[[Sage-MVP-Functional-Spec]]", "[[FEAT-sage-mvp]]", "[[0007-boutique-retail-mvp-beachhead]]", "[[Workspace-UI-Design-Decisions]]"]
---

# Product Vision

This is the MOC for [[Product/Features|Features]] and the thing every feature spec should trace back to.

**MVP authority:** [[Sage-MVP-Functional-Spec]] supersedes market framing below for implementation scope. This note captures long-term direction + how MVP fits.

## Problem

Staff at small businesses need **consistent operational knowledge** on demand — SOPs, training docs, policies, product catalogs — without training videos or hunting through scattered files. Knowledge walks out the door with turnover; service quality shouldn't depend on who's on shift.

## Who it's for (MVP)

- **Boutique retail staff** — shared store tablets, high turnover, minimal training, interruption-driven floor work. See [[Sage-MVP-Functional-Spec#12. Device & Environment Assumptions]].
- **Store managers/admins** — upload and maintain the knowledge base, manage staff accounts.
- **Future:** hotel front-desk (prior target market) — same core value prop, different beachhead timing. See [[0007-boutique-retail-mvp-beachhead]].

## What Sage is (MVP)

Three regions:
- **Left** — file tree / knowledge base manager
- **Middle** — file preview
- **Right** — "Ask Sage" chat with transparent retrieval (searched → found N articles → cited answer)

## Long-term vision (post-MVP, not dropped)

A **modular workspace shell** — dock of connected apps, panels as slots, Cursor-style tabs in center stage. Documented in [[Workspace-UI-Design-Decisions]]. MVP ships the simplest expression (three columns) first.

## Non-goals (MVP)

- Not a standalone document viewer — it's an operational knowledge + AI assistant.
- Not the full workspace shell with dock/tabs/apps in MVP.
- Not answering from general knowledge when store docs don't match ([[0006-keyword-retrieval-mvp]]).
- Not offline — requires internet.

## Success looks like (MVP)

- Any staff member can ask a policy/product question and get a cited answer from uploaded docs.
- Admins can upload, tag, and replace documents without engineering help.
- Staff personalize workspace (bookmarks, folders, theme) across shared devices.
- Pilot-ready on iPad/Android tablet POS hardware.
- AI cost sustainable at boutique query volumes (~$4–70/mo LLM depending on model — see spec §7.3, §8).

## Prior hotel framing (superseded for MVP beachhead)

Earlier docs targeted hotel front-desk personas ([[Workspace-UI-Design-Decisions#Hotel staff design constraints]]). Patterns still apply (shared workstations, interruption-driven work, minimal training) — retail floor staff share the same constraints. Hospitality remains a future market.
