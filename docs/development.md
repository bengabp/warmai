# Development

## Prerequisites

- Python ≥ 3.11
- Node ≥ 22
- [uv](https://docs.astral.sh/uv/) ≥ 0.5
- A running MongoDB (any local install or `docker run -d -p 27017:27017 mongo:7`)

## Backend

```bash
cd backend
uv sync --extra dev
uv run pytest                       # run tests
WARMAI_MONGODB_URL=mongodb://localhost:27017 \
  WARMAI_USER_FILES_DIR=$(pwd)/.data \
  uv run python -m app
```

Hot-reload: `uv run uvicorn app.api:app --reload --port 8080`.

API docs at <http://localhost:8080/docs>.

## Frontend

```bash
cd frontend
npm install
NEXT_PUBLIC_API_URL=http://localhost:8080 npm run dev
```

UI at <http://localhost:3000>.

## Tests

```bash
cd backend && uv run pytest -v
```

Backend tests are pure (no DB). They cover utility helpers, password hashing,
JWT round-trip, and the warmup volume math.

## Linting

```bash
cd backend && uv run ruff check .
cd frontend && npx tsc --noEmit
```

## Code layout

- `backend/app/api.py` — FastAPI factory + lifespan + exception handlers.
- `backend/app/scheduler.py` — APScheduler integration + tick logic.
- `backend/app/routers/` — one file per resource (auth, mail-servers, ...).
- `backend/app/models.py` — Beanie documents (single source of truth).
- `backend/app/schemas.py` — Pydantic request/response models (camelCase).
- `frontend/src/lib/queries.ts` — TanStack Query hooks per endpoint.
- `frontend/src/app/(dashboard)` — authenticated routes.
- `frontend/src/app/(auth)` — public auth routes.
