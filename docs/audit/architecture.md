# QQuiz Architecture Audit

## Scope

This document records the current system shape and the approved target
direction for the ongoing refactor.

Audit date: 2026-04-17

## Current Architecture

### Backend

- Runtime: FastAPI + SQLAlchemy async
- Database access: direct ORM session injection per request
- Task execution: in-process `BackgroundTasks`
- Progress streaming: in-memory `ProgressService`
- Schema management: mixed `create_all()` and Alembic placeholders

### Frontend

- Runtime: React 18 + Vite SPA
- Routing: `react-router-dom`
- Auth state: client-only `localStorage` token + context
- API transport: axios interceptor with browser redirects
- Styling: Tailwind CSS with page-local utility classes

### Deployment

- `docker-compose.yml`: development-oriented split stack
- `docker-compose-single.yml`: monolith container with SQLite
- `Dockerfile`: FastAPI serves the built SPA as static assets

## Target Architecture

### Backend

- Keep FastAPI as the system API boundary
- Move heavy router logic into typed services
- Use Alembic as the only schema migration path
- Introduce durable ingestion execution semantics
- Replace implicit transaction patterns with explicit service-level boundaries

### Frontend

- New app in `web/`
- Stack: Next.js App Router + TypeScript + Tailwind + shadcn/ui
- Auth: `HttpOnly` session cookie mediated by Next route handlers
- Data fetching: `fetch` wrappers for server/client usage
- Streaming: Next proxy route for exam progress SSE

### Deployment

- Split deployment becomes the primary production shape
- Monolith mode remains secondary compatibility mode
- Development and production Compose files must be separated

## Core Constraints

1. Do not overwrite existing uncommitted user changes in the legacy frontend.
2. Keep the legacy `frontend/` app available until the new `web/` app reaches functional parity.
3. Preserve backend API contracts where possible during the frontend migration.
4. Fix deployment/documentation drift before treating new frontend work as production-ready.

## Immediate Workstreams

1. Remove abandoned ESA captcha wiring from the legacy frontend.
2. Write audit documents and freeze the migration backlog.
3. Scaffold the new `web/` frontend without disturbing the legacy app.
4. Fix first-order deployment issues such as health checks and documented mount paths.
