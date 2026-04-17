# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI API. Keep HTTP entrypoints in `routers/`, reusable business logic in `services/`, database definitions in `models.py`, request/response schemas in `schemas.py`, and migrations in `alembic/`.
- `frontend/`: React 18 + Vite client. Put route screens in `src/pages/`, shared UI in `src/components/`, auth state in `src/context/`, API wrappers in `src/api/`, and helpers in `src/utils/`.
- `docs/` holds deployment and architecture notes, `scripts/run_local.sh` bootstraps local Linux/macOS development, `test_data/` contains sample question files, and `.github/workflows/docker-publish.yml` publishes container images.

## Build, Test, and Development Commands
- `docker compose up -d --build`: start MySQL, backend on `:8000`, and frontend on `:3000`.
- `docker compose -f docker-compose-single.yml up -d --build`: start the single-container SQLite deployment.
- `cd backend && pip install -r requirements.txt && alembic upgrade head && uvicorn main:app --reload --host 0.0.0.0 --port 8000`: run the API locally.
- `cd frontend && npm install && npm run dev`: start the Vite dev server.
- `cd frontend && npm run build`: create a production frontend bundle.

## Coding Style & Naming Conventions
- Python uses 4-space indentation, `snake_case` for modules/functions, and `PascalCase` for ORM or Pydantic classes.
- React files use `PascalCase.jsx` for pages/components and `camelCase` for state, helpers, and API wrappers.
- Keep route handlers thin: validation in schemas, orchestration in routers, reusable logic in `backend/services/`.
- No formatter or lint script is enforced today, so match surrounding style before making broad formatting changes.

## Testing Guidelines
- The repository currently has no committed automated test suite or coverage gate.
- Before opening a PR, smoke-test auth, exam creation/upload, parsing progress, quiz playback, mistake review, and admin settings.
- Use `test_data/sample_questions*.txt` for parser and import checks.
- If you add tests, place backend tests under `backend/tests/test_*.py` and frontend tests under `frontend/src/__tests__/`.

## Commit & Pull Request Guidelines
- Recent history favors short, focused subjects, often imperative and sometimes Chinese, such as `安全修复和管理员账号密码自定义`.
- Keep each commit scoped to one change. PRs should include a summary, affected areas, config or migration notes, linked issues, and UI screenshots or GIFs for frontend changes.

## Security & Configuration Tips
- Copy `.env.example` to `.env`; never commit real API keys or passwords.
- `SECRET_KEY` must be at least 32 characters, and `ADMIN_PASSWORD` at least 12.
- Update `.env.example` and relevant docs whenever configuration keys or security-sensitive defaults change.
