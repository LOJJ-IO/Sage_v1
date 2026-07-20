# Retrieval contracts

Sacred tests for Sage on `tolu-implementations`. They define the API the backend must implement.

| File | Invariant |
|---|---|
| `test_tenant_isolation.py` | No cross-tenant retrieval, ever |
| `test_file_lifecycle.py` | Delete/replace cascade; failed ingest never `"indexed"` |

## Rules

1. **Adjust imports and helper locations — never assertions.**
2. Red / `ImportError` is expected until the modules exist. Build `retrieve` / `ingest_text` / etc. to make them green.
3. Do not `xfail`, skip, or delete these to unblock a PR.
4. Every production retrieval path must call the same `retrieve(business_id=..., query=...)`.

See Cursor rule `sage-retrieval-contracts` and `second-brain/Engineering/Retrieval-Contracts.md`.
