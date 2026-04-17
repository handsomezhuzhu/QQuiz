# Frontend Cutover Notes

## Decision

`web/` is now the only frontend in the repository.

The previous Vite SPA has been removed so that:

- split deployment and single-container deployment use the same UI
- documentation no longer has to describe two competing frontend stacks
- future frontend changes only need to be implemented once

## Runtime Model

### Auth

- Login goes through Next route handlers under `/frontend-api/auth/*`
- Backend JWT is stored in an `HttpOnly` cookie
- Browser code never reads the raw token

### Data

- Server pages use server-side fetch helpers against FastAPI
- Client mutations use browser-side fetch helpers against `/frontend-api/proxy/*`
- FastAPI continues to own the public `/api/*` surface

### Streaming

- Browser connects to `/frontend-api/exams/{examId}/progress`
- The route reads the session cookie and proxies backend SSE
- Backend token query parameters stay hidden from the browser

## Deployment Outcome

### Split Stack

- `backend` serves API traffic on `:8000`
- `web` serves Next.js on `:3000`

### Single Container

- the container runs both FastAPI and Next.js
- FastAPI stays on `:8000`
- non-API requests are proxied from FastAPI to the embedded Next server

## Follow-up Expectations

1. New frontend work lands only in `web/`
2. Single-container smoke tests must validate both UI and API paths
3. Deployment docs must continue to describe `web/` as the sole frontend
