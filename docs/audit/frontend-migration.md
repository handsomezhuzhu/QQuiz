# Frontend Migration Plan

## Decision

The legacy Vite SPA remains in `frontend/` as a fallback.

The new frontend is being built in `web/` with:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui component model

The abandoned ESA captcha integration has been removed from the legacy login page.

## Why a Rewrite Instead of an In-Place Port

The legacy frontend mixes too many browser-only assumptions into core runtime
boundaries:

- token storage in `localStorage`
- `window.location` redirects inside transport code
- client-only route protection
- SSE token passing in query strings

Those patterns do not map cleanly onto Next App Router and server-first auth.

## New Runtime Model

### Auth

- Login goes through Next route handlers
- Backend JWT is stored in an `HttpOnly` cookie
- Browser code never reads the raw token

### Data

- Server pages use server-side fetch helpers
- Client mutations use browser-side fetch helpers against Next proxy routes
- URL state is used for pagination and filters

### Streaming

- Browser connects to a same-origin Next progress route
- The route reads the session cookie and proxies backend SSE
- Backend URL tokens are hidden from the browser

## Directory Map

```text
web/
  src/app/
  src/components/
  src/lib/
  src/middleware.ts
```

## Migration Order

1. Auth shell, layouts, middleware, and proxy routes
2. Dashboard, exams list, questions list, and admin overview
3. Exam detail upload and progress streaming
4. Quiz and mistake-practice flows
5. Cutover, smoke testing, and legacy frontend retirement

## Non-Goals for This First Slice

- No immediate removal of the legacy `frontend/`
- No backend contract rewrite yet
- No server actions as the primary data mutation layer
