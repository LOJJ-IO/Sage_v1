---
type: engineering
status: active
tags: [area/backend, priority/critical]
created: 2026-07-19
updated: 2026-07-19
related: ["[[Sage-MVP-Functional-Spec]]", "[[0006-keyword-retrieval-mvp]]", "[[Database-Schema]]", "[[FEAT-file-upload]]", "[[Current-Context]]"]
---

# Retrieval contracts (non-negotiable)

Source of truth in code: `backend/tests/contracts/`. Cursor rule: `.cursor/rules/sage-retrieval-contracts.mdc`.

These tests were written **before** the retriever. They are the product contract. Implementation adapts to the tests — not the reverse.

## Why they exist

| Contract | Failure mode if ignored |
|---|---|
| **Tenant isolation** | Store A cites Store B's return policy. Invisible with one pilot tenant; catastrophic at tenant #2. |
| **File lifecycle** | Admin deletes/replaces a policy; Sage still answers from orphaned content. Grounding promise broken. |

## Surface area the contracts require

| Symbol | Role |
|---|---|
| `retrieve(business_id, query, ...)` | Sole retrieval chokepoint; `business_id` required |
| `ingest_text(business_id, file_id, text)` | Index path (chunk → embed/index → store) |
| `delete_file` / `replace_file` | Must cascade to indexed content |
| `get_file_status` / `count_chunks` | Observability for lifecycle assertions |
| `new_business` / `reset_db` | Test helpers |

## Relationship to ADR-0006

MVP retrieval is **keyword/tag** ([[0006-keyword-retrieval-mvp]]), not vector search. That does **not** waive these contracts:

- Isolation and cascade still apply to whatever is stored (`extracted_text`, chunks, or both).
- The failure-ingest test monkeypatches the step that must succeed before status `"indexed"` (named `embed_chunks` in the contract; wire to extract/index if that is the MVP gate).
- **Do not weaken assertions** to match a thinner MVP. Prefer implementing the named helpers with the same semantics.

## Agent / PR checklist

- [ ] Contract tests present and not skipped
- [ ] No retrieve/list path without `business_id`
- [ ] Delete/replace verified against retrieve + `count_chunks`
- [ ] Failed indexing never leaves `"indexed"`
