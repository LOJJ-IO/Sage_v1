---
type: architecture
status: active
tags: [area/backend]
created: 2026-07-01
updated: 2026-07-06
related: ["[[Architecture-Overview]]", "[[Sage-MVP-Functional-Spec#9. Database Schema (Draft)]]", "[[0002-supabase-postgres-backend-only]]"]
---

# Database Schema

Draft schema from [[Sage-MVP-Functional-Spec#9. Database Schema (Draft)]] — implement when backend work begins. All tables scoped by `business_id` where applicable; **no cross-tenant reads, ever**.

## Tenancy

### businesses
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| name | text | |
| created_at | timestamptz | |

## Users & shared knowledge base (per business)

### users
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| business_id | uuid | FK → businesses |
| username | text | Unique per business_id |
| pin_hash | text | bcrypt/argon2 |
| role | enum | `admin` \| `staff` |
| is_primary_admin | boolean | LOJJ-created first admin; protected |
| is_active | boolean | Deactivate, not hard-delete |
| must_change_pin | boolean | After create or admin PIN reset |
| failed_attempts | int | Brute-force lockout |
| locked_until | timestamptz | Nullable |
| created_at | timestamptz | |

### files
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| business_id | uuid | FK |
| filename | text | Duplicates allowed (id is identity) |
| storage_path | text | Supabase Storage path |
| file_type | text | pdf, docx, image, etc. |
| uploaded_by | uuid | FK → users |
| auto_tags | jsonb/array | From filename at upload |
| approved_tags | jsonb/array | Admin-edited tags |
| extracted_text | text | Populated once at upload; LLM input |
| folder_id | uuid | FK → folders (shared structure) |
| created_at | timestamptz | Retained on replace |

### folders
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| business_id | uuid | FK |
| name | text | |
| parent_folder_id | uuid | Nullable; nested folders |
| position | int | Ordering |
| created_by | uuid | FK → users |

## Per-user / personal workspace

### user_preferences
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK → users |
| theme | text | |
| layout_config_json | jsonb | Sidebar width, UI micro-state |
| updated_at | timestamptz | Debounced batch-save |

### user_personal_folders
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| folder_name | text | Personal view only |
| parent_folder_id | uuid | Nullable |
| position | int | Drag-and-drop order |

### user_personal_folder_contents
| Column | Type | Notes |
|---|---|---|
| user_id | uuid | FK |
| personal_folder_id | uuid | FK |
| file_id | uuid | FK → files |
| position | int | |

### bookmarks
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| file_id | uuid | FK |

### chat_history
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| query | text | |
| response | text/json | |
| files_used_json | jsonb | Citation sources |
| created_at | timestamptz | |

### fallback_events
| Column | Type | Notes |
|---|---|---|
| id | uuid | PK |
| user_id | uuid | FK |
| query | text | Zero-match question |
| suggested_file_ids_json | jsonb | Files user pointed Sage to |
| created_at | timestamptz | Tag-improvement telemetry |

## Ownership

| Table group | Writer | Reader |
|---|---|---|
| businesses, users, files, folders | FastAPI only | FastAPI (scoped by business_id + role) |
| user_preferences, personal folders, bookmarks, chat_history, fallback_events | FastAPI only | FastAPI (scoped by user_id) |
| Supabase Storage blobs | FastAPI only (proxy) | FastAPI only |

VoltAgent **never** writes to Postgres — FastAPI is the sole DB writer.

## Key principles

- **Shared KB** (files, folders, tags): admin-controlled, same for everyone in the business.
- **Personal workspace** (preferences, personal folders, bookmarks): per-user, visual-only — does not affect Sage retrieval.
- **Personal folder arrangement** does not change what Sage retrieves.

## Migration log

| Date | Migration | Reason | ADR |
|---|---|---|---|
| — | — | Schema not yet implemented | [[Sage-MVP-Functional-Spec]] |
