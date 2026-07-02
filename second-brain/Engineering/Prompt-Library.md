---
type: prompt
status: active
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Coding-Standards]]", "[[Intake-Process]]"]
---

# Prompt Library

Reusable prompts for Claude Code / Cursor that are specific to this repo — things worth saving so they're pasted, not re-composed. Generic prompt-engineering advice doesn't belong here; only prompts tuned to Sage's codebase/conventions.

## Format
```
### Name
**Use for:** ...
**Prompt:**
> ...
```

## Prompts

### New feature, vault-aware
**Use for:** kicking off a feature so Claude checks the vault first.
**Prompt:**
> Before implementing, check `second-brain/Current/Current-Context.md`, `second-brain/Product/Features/` for an existing spec, and `second-brain/Architecture/` for relevant ADRs. Implement <feature>. When done, add/update the feature spec and note anything vault-worthy in `Lessons-Learned.md`.

### End-of-session write-back
**Use for:** making sure a session's context survives.
**Prompt:**
> Update `second-brain/Current/Current-Context.md` to reflect what changed this session, append a summary to today's `second-brain/Daily/` note, and file an ADR/bug/feature-spec update if applicable.

### Triage the intake inbox
**Use for:** processing non-technical reports (bug reports, feedback, decisions) submitted via the intake form. See [[Intake-Process]].
**Prompt:**
> Triage everything in `second-brain/Inbox/`. For each entry, file it into the correct permanent note (Bug-Report, Known-Issues, Customer-Feedback, ADR, or Roadmap) using the matching template, update `status: triaged` with a link to where it went, then delete the Inbox file.
