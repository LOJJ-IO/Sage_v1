# Sage — Engineering Second Brain

This is not a note-taking vault. It is **external memory for AI coding agents** (Claude Code, Cursor) and for you. The goal: you should almost never have to re-explain context to Claude — Claude should retrieve it from here, and should write back to it as work happens.

Open this folder (`second-brain/`) directly as an Obsidian vault (`File → Open folder as vault`).

## How this works

1. **Claude reads before it acts.** At the start of a task, Claude Code should check [Current/Current-Context.md](Current/Current-Context.md), the relevant folder MOC, and any linked notes before asking you for context.
2. **Claude writes as it goes.** When Claude makes an architecture decision, fixes a bug, ships a feature, or learns something non-obvious, it appends/updates the relevant note — not just this conversation's memory.
3. **You correct in the vault, not just in chat.** If a note is wrong, edit it or tell Claude to update it. Stale docs are worse than no docs, so correctness here is the highest-leverage thing you can maintain.
4. **The repo's `CLAUDE.md` is the entry point.** It tells any agent working in this repo that this vault exists and how to use it. See [/CLAUDE.md](../CLAUDE.md).
5. **Cursor always-applies this too.** `.cursor/rules/second-brain.mdc` makes read-before / write-after mandatory for every session — not optional, not "when convenient."

## Folder map

| Folder | Purpose |
|---|---|
| [Current/](Current/Current-Context.md) | What's true *right now* — active work, priorities, roadmap, sprint log. Highest churn, always current. |
| [Architecture/](Architecture/Architecture-Overview.md) | System design, tech stack, database schema, API docs, ADRs (why decisions were made). |
| [Product/](Product/Product-Vision.md) | Why the product exists, UI/UX guidelines, feature specs, customer feedback. |
| [Engineering/](Engineering/Coding-Standards.md) | How we write code, bugs, known issues, lessons learned, deployment notes, reusable patterns, commands, prompts. |
| [Research/](Research/) | Spikes, comparisons, external reading, investigation notes. |
| [Meetings/](Meetings/) | Meeting notes and decisions that came out of them. |
| [Daily/](Daily/) | One note per working day — a log, not a destination. Distilled insights get promoted into permanent notes. |
| [Weekly/](Weekly/) | Weekly rollup — what shipped, what's next, what changed in the vault. |
| [Templates/](Templates/) | Every note type's template. New notes should always start from one of these. |

See [00-Home.md](00-Home.md) for the full map of content (MOC).

## Non-negotiables

- **Frontmatter on every note.** It's what makes Dataview queries and AI retrieval work. See the standard below.
- **Link, don't duplicate.** If a fact belongs in `Architecture-Overview.md`, don't restate it in a feature spec — link to it.
- **Daily notes are scratch, permanent notes are truth.** Nothing should live *only* in a daily note forever. Promote it or let it age out.
- **Every ADR, bug, and feature spec gets a unique ID** (see naming conventions below) so links never break on rename.

## Naming conventions

- Folders/files: `Title-Case-With-Hyphens.md` (Obsidian-safe, readable in a terminal, greppable).
- Daily notes: `Daily/YYYY-MM-DD.md`.
- Weekly notes: `Weekly/YYYY-[W]ww.md` (e.g. `2026-W27.md`).
- ADRs: `Architecture/Decisions/NNNN-short-title.md`, zero-padded 4-digit sequence (`0001-use-postgres-over-mongo.md`). Never renumber or delete — supersede instead.
- Bugs: `Engineering/Bugs/BUG-NNNN-short-title.md`.
- Feature specs: `Product/Features/FEAT-short-title.md` (slug is stable identity; no number needed since names rarely collide).
- Research: `Research/YYYY-MM-DD-short-title.md` (dated because research is time-bound — "as of when I looked").

## Frontmatter standard

Every note (except Home/README) starts with YAML frontmatter:

```yaml
---
type: architecture | decision | feature | bug | research | meeting | daily | weekly | context | roadmap | pattern | command | prompt
status: draft | active | resolved | deprecated | superseded | archived
tags: [area/backend, area/frontend, area/infra, ...]
created: YYYY-MM-DD
updated: YYYY-MM-DD
related: ["[[Other-Note]]"]
---
```

`type` + `status` is what Dataview and AI queries filter on. `tags` are for cross-cutting areas (`area/*`, `priority/*`) — see [Tags](#tags) below.

## Tags

Keep the tag vocabulary small and namespaced so it doesn't sprawl:

- `area/frontend`, `area/backend`, `area/infra`, `area/design`
- `priority/high`, `priority/medium`, `priority/low`
- `status/blocked`, `status/needs-review`

Don't create a new tag per note — if you're tempted to, that's what `title` and links are for.

## Plugins (recommended)

| Plugin | Why |
|---|---|
| **Dataview** | Query notes by frontmatter (`type`, `status`, `tags`) to build live dashboards — e.g. "all open bugs," "all ADRs touching `auth`." This is what turns the vault into a database, not just linked text files. |
| **Templater** | Turns `Templates/*.md` into fill-in-the-blank note creation (auto-fills `created`, prompts for `type`-specific fields). |
| **Tasks** | Global task queries across notes (`- [ ]` checkboxes), so TODOs in feature specs / bugs surface in one place. |
| **Git** (obsidian-git) | Auto-commit/push the vault on a schedule — pairs with keeping this folder in the repo's git history. |
| **QuickAdd** | Bind hotkeys/commands to "new bug," "new ADR," etc. using the Templater templates — lowers friction to actually writing things down. |
| **Excalidraw** (optional) | For architecture diagrams that don't fit in text — link the `.excalidraw` file from `Architecture-Overview.md`. |

Skip anything PARA/Zettelkasten-flavored (no "fleeting notes," no "MOC of MOCs" recursion) — it adds ceremony this system doesn't need. The type-based folder structure + Dataview already gives you retrieval without a second taxonomy layered on top.

## Graph view

The default Obsidian graph will be noisy. Configure graph groups by tag/folder in **Settings → files/tags filters**:
- Color `Architecture/*` distinctly from `Product/*` and `Engineering/*`.
- Filter out `Daily/` and `Weekly/` from the default view (toggle on when you specifically want to see recent activity clustering) — they're high-churn and drown the signal from permanent notes.

## Search

- Obsidian's core search supports `path:`, `tag:`, `file:` filters — e.g. `type: bug status: active` finds open bugs via frontmatter (with Dataview inline queries this becomes a live table instead of a manual search).
- For Claude Code doing a `grep`/`rg` pass over the vault from the terminal, frontmatter `type:` and `status:` fields make this trivially scriptable — e.g. `rg -l "^type: decision" second-brain/Architecture/Decisions/`.
