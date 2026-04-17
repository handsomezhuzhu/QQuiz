# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI API. Keep HTTP entrypoints in `routers/`, reusable business logic in `services/`, database definitions in `models.py`, request/response schemas in `schemas.py`, and migrations in `alembic/`.
- `web/`: Next.js frontend for active development. Keep route screens under `src/app/` or related route segments, shared UI in `src/components/`, API wrappers in `src/lib/`, and helpers close to their consumers.
- `docs/` holds deployment and architecture notes, `scripts/run_local.sh` bootstraps local Linux/macOS development, `test_data/` contains sample question files, and `.github/workflows/docker-publish.yml` publishes the single-container image.

## Build, Test, and Development Commands
- `docker compose -f docker-compose-single.yml up -d --build`: start the default single-container deployment with FastAPI proxying the embedded Next.js frontend.
- `docker compose up -d --build`: start the split development stack with backend on `:8000` and frontend on `:3000`.
- `cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn main:app --reload --host 0.0.0.0 --port 8000`: run the API locally.
- `cd web && npm install && npm run dev`: start the Next.js dev server.
- `cd web && npm run build`: create a production frontend bundle.

## Coding Style & Naming Conventions
- Python uses 4-space indentation, `snake_case` for modules/functions, and `PascalCase` for ORM or Pydantic classes.
- React and Next.js files use the naming conventions already established in `web/`; preserve route segment and component naming patterns in place.
- Keep route handlers thin: validation in schemas, orchestration in routers, reusable logic in `backend/services/`.
- No formatter or lint script is enforced today, so match surrounding style before making broad formatting changes.

## Testing Guidelines
- The repository currently has no committed automated test suite or coverage gate.
- Before opening a PR, smoke-test auth, exam creation/upload, parsing progress, quiz playback, mistake review, and admin settings.
- Use `test_data/sample_questions*.txt` for parser and import checks.
- If you add tests, place backend tests under `backend/tests/test_*.py` and frontend tests under `web/src/__tests__/`.

## Commit & Pull Request Guidelines
- Recent history favors short, focused subjects, often imperative and sometimes Chinese, such as `安全修复和管理员账号密码自定义`.
- Keep each commit scoped to one change. PRs should include a summary, affected areas, config or migration notes, linked issues, and UI screenshots or GIFs for frontend changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit real API keys or passwords.
- `SECRET_KEY` must be at least 32 characters, and `ADMIN_PASSWORD` at least 12.
- Update `.env.example` and relevant docs whenever configuration keys or security-sensitive defaults change.
