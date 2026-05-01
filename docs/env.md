# Environment variables

All backend settings have the prefix `WARMAI_` and are loaded by
`pydantic-settings` from `.env` or the process environment. `.env.example` at
the repo root documents the canonical set.

## Backend (`WARMAI_*`)

| Variable                            | Default                                                  | Notes                                                                                  |
| ----------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `WARMAI_ENVIRONMENT`                | `development`                                            | One of `development`, `staging`, `production`. Switches scheduler interval defaults.    |
| `WARMAI_API_VERSION`                | `v1`                                                     | URL prefix.                                                                             |
| `WARMAI_MONGODB_URL`                | `mongodb://localhost:27017`                              | Connection string.                                                                      |
| `WARMAI_MONGODB_DB`                 | `warmai`                                                 | Database name.                                                                          |
| `WARMAI_SECRET_KEY`                 | `change-me-please-use-a-long-random-string`              | JWT signing key. **Must** be set in production.                                         |
| `WARMAI_JWT_ALGORITHM`              | `HS256`                                                  | JWT algorithm.                                                                          |
| `WARMAI_ACCESS_TOKEN_TTL_SECONDS`   | `259200`                                                 | Token lifetime (3 days default).                                                        |
| `WARMAI_SIGNUP_ACCESS_CODE`         | `admin`                                                  | Required code for the `/signup` endpoint.                                               |
| `WARMAI_HOST`                       | `0.0.0.0`                                                | Uvicorn bind host.                                                                      |
| `WARMAI_PORT`                       | `8080`                                                   | Uvicorn bind port.                                                                      |
| `WARMAI_CORS_ORIGINS`               | `["*"]`                                                  | JSON-encoded list. Tighten in production.                                               |
| `WARMAI_SCHEDULER_INTERVAL_SECONDS` | `0`                                                      | `0` = use the default (30s in dev, 1 day in prod). Override for testing.                 |
| `WARMAI_WARMUP_RECIPIENT_OVERRIDE`  | empty                                                    | If set, every warmup mail goes here instead of the real recipient. Use for dev/staging. |
| `WARMAI_USER_FILES_DIR`             | `/app/data/user_files`                                   | Where uploaded CSVs land.                                                               |
| `WARMAI_LOG_LEVEL`                  | `INFO`                                                   | Standard Python log levels.                                                             |
| `WARMAI_LOG_FORMAT`                 | `console`                                                | `console` (colored) or `json` (machine-parseable).                                      |

## Frontend (`NEXT_PUBLIC_*`)

Frontend env is **build-time** — embedded by Next.js when the image is built.

| Variable                  | Default                  | Notes                                  |
| ------------------------- | ------------------------ | -------------------------------------- |
| `NEXT_PUBLIC_API_URL`     | `http://localhost:8080`  | Where the browser reaches the backend. |
| `NEXT_PUBLIC_API_VERSION` | `v1`                     | URL prefix; matches `WARMAI_API_VERSION`. |

## Compose-only

| Variable          | Default | Notes                  |
| ----------------- | ------- | ---------------------- |
| `BACKEND_PORT`    | `8080`  | Host-side port mapping |
| `FRONTEND_PORT`   | `3000`  | Host-side port mapping |
| `MONGO_PORT`      | `27017` | Host-side port mapping |
