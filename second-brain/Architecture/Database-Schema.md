---
type: architecture
status: draft
tags: []
created: 2026-07-01
updated: 2026-07-01
related: ["[[Architecture-Overview]]"]
---

# Database Schema

No database exists yet. Once one is chosen (track the decision as an ADR in [[Architecture/Decisions]]), this file becomes the source of truth for:

## Format once populated

For each table/collection:

```
### table_name
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| ... | ... | ... |

Relationships: belongs_to / has_many ...
Indexes: ...
```

## Migration log

Track schema-changing migrations here (or link to the migration files) so "why does this column exist" is answerable without archaeology:

| Date | Migration | Reason | ADR |
|---|---|---|---|
| — | — | — | — |

## Ownership

Note which service/team owns writes to each table once there's more than one writer — prevents accidental cross-service writes.
