---
type: architecture
status: active
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Tech-Stack]]", "[[Database-Schema]]", "[[API-Documentation]]"]
---

# Architecture Overview

The living map of how the system fits together. This is the MOC for [[Architecture/Decisions|ADRs]] — when a decision changes the shape of the system, update this file's diagram/description AND write an ADR explaining why.

## System diagram

```
frontend/  (Next.js 16, React 19)
   |
   v
backend/   (not yet implemented — see Architecture/Decisions for the eventual choice)
   |
   v
[data store — TBD]
```

*Replace this ASCII sketch with an Excalidraw/Mermaid diagram once the system has enough parts to warrant one — link it here rather than redrawing in text.*

## Components

### frontend/
Next.js App Router project. Currently a single-page app shell with resizable side panels. See [[Tech-Stack]] for dependency detail.

### backend/
Empty — not yet started. When work begins here, this section should describe: framework, how it's structured (monolith/services), how it talks to the frontend (REST/GraphQL/RPC — document in [[API-Documentation]]), and link the ADR that made the call.

## How to keep this current

- New service/major component added → add a section here + update the diagram.
- Data flow changes → update this file, don't just leave it in a PR description.
- The *why* behind a structural choice belongs in an ADR ([[Architecture/Decisions]]), linked from here — this file describes *what exists*, ADRs explain *why it exists this way*.
