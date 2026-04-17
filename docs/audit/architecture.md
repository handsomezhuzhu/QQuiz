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

- Runtime: Next.js App Router + TypeScript
- Routing: file-system routing + middleware guards
- Auth state: `HttpOnly` cookie managed by Next route handlers
- API transport: server/client fetch helpers with same-origin proxy routes
- Styling: Tailwind CSS + shadcn/ui patterns

### Deployment

- `docker-compose.yml`: split development stack
- `docker-compose-single.yml`: default single-container deployment
- `Dockerfile`: single image running FastAPI + embedded Next.js

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

- Single-container deployment is the primary release path
- Split deployment remains available for development and compatibility testing
- Development and production Compose files must stay explicitly separated

## Core Constraints

1. Preserve backend API contracts where possible across frontend changes.
2. Keep single-container and split-stack behavior aligned on the same `web/` frontend.
3. Fix deployment/documentation drift before treating changes as production-ready.
4. Avoid reintroducing duplicate frontend implementations.

## Immediate Workstreams

1. Keep single-container delivery using the same `web/` frontend as split deployment.
2. Continue moving backend orchestration into typed services.
3. Tighten health checks and deployment docs around the embedded Next runtime.
4. Cover remaining functional gaps with smoke tests.
