# Deployment Findings

## Current Problems

### Monolith persistence documentation is wrong

- Existing `docker run` examples mounted the wrong path
- SQLite and upload persistence must target `/app/data` and `/app/uploads`

### Monolith health check was broken

- `docker-compose-single.yml` used `curl`
- The image does not guarantee `curl` exists
- The health check has been switched to Python stdlib HTTP probing

### Split Compose is development-oriented

- Source mounts are enabled
- Backend runs with `uvicorn --reload`
- Frontend runs a dev server
- This is not a production deployment model

### Security posture is weak

- Compose contains hard-coded MySQL credentials
- MySQL is exposed on `3306`
- Environment guidance is inconsistent across README, Compose, and `.env.example`

## Approved Direction

1. Treat split deployment as the default production topology.
2. Keep monolith deployment as a compatibility target only.
3. Separate development assets from production assets.
4. Validate all release images with smoke checks before publishing.

## Backlog

### Short term

- Create `compose.dev.yml` and `compose.prod.yml`
- Remove dev-server assumptions from production documentation
- Add backend runtime dependencies explicitly to image builds
- Align README with actual mount paths and health checks

### Medium term

- Add PR build, typecheck, lint, and smoke-test workflows
- Publish separate images for API and Next web app
- Document rollback by image tag and Compose profile
