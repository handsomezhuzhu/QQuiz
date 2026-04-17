# Backend Findings

## Critical Findings

### Schema lifecycle is unsafe

- App startup still calls `create_all()`
- Alembic metadata exists but the migration chain is effectively empty
- This prevents controlled upgrades and rollbacks

Files:

- `backend/main.py`
- `backend/database.py`
- `backend/alembic/versions/.gitkeep`

### Parsing tasks are not durable

- Document ingestion runs inside FastAPI `BackgroundTasks`
- Progress state lives in-process only
- Process restarts or horizontal scaling can strand exams in `pending` or `processing`

Files:

- `backend/routers/exam.py`
- `backend/services/progress_service.py`

### Transaction boundaries are inconsistent

- `get_db()` performs commit/rollback automatically
- Routers and background tasks also call `commit()` directly
- SSE endpoints keep a database dependency open for long-lived streams

Files:

- `backend/database.py`
- `backend/routers/exam.py`

## High-Priority Bugs

### Admin config can destroy secrets

- `GET /api/admin/config` masks API keys
- `PUT /api/admin/config` persists whatever the frontend sends back
- A round-trip save can replace the real secret with the masked placeholder

Files:

- `backend/routers/admin.py`

### LLM service has import-time side effects

- `LLMService()` is instantiated at module import time
- Missing environment variables can break startup before DB-backed config is loaded

Files:

- `backend/services/llm_service.py`

### Ingestion deduplication is race-prone

- No unique DB constraint on `(exam_id, content_hash)`
- Multiple append operations can race and insert duplicates

Files:

- `backend/models.py`
- `backend/routers/exam.py`

### Answer checking degrades incorrectly on infra failure

- Short-answer grading failures are converted into zero scores
- User mistake data can be polluted by provider outages or config errors

Files:

- `backend/services/llm_service.py`
- `backend/routers/question.py`

## Refactor Order

1. Replace runtime schema creation with Alembic-first migrations.
2. Move ingestion, config, and answer checking into service classes.
3. Introduce explicit transaction boundaries and idempotent ingestion rules.
4. Add durable task execution and real status/error semantics.
5. Add integration tests for config round-trips, ingestion races, and answer normalization.
