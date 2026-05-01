# WarmAI

Email warmup automation. Connects to your SMTP servers, ramps send volume day
by day, and tracks reputation signals so cold inboxes stay out of spam.

```
┌───────────────┐     ┌──────────────────┐     ┌──────────┐
│ Next.js 16    │────▶│ FastAPI + uv     │────▶│ MongoDB  │
│ shadcn/ui     │     │ AsyncIO scheduler│     │          │
└───────────────┘     └──────────────────┘     └──────────┘
```

## Quickstart

```bash
cp .env.example .env
# edit .env — at minimum set WARMAI_SECRET_KEY
docker compose up -d --build
```

- API: <http://localhost:8080> (docs at `/docs`)
- UI: <http://localhost:3000>

First user signs up at `/signup` using the `WARMAI_SIGNUP_ACCESS_CODE` from `.env`.

## Project layout

```
backend/        FastAPI app + AsyncIO scheduler (uv-managed)
frontend/       Next.js 16 + shadcn/ui
docs/           Architecture, deployment, env, dev guides
docker-compose.yml
.env.example
```

## Documentation

- [Architecture](docs/architecture.md) — services, data flow, scheduler model
- [Development](docs/development.md) — running each service locally
- [Deployment](docs/deployment.md) — docker compose & production notes
- [Environment](docs/env.md) — every config variable
- [API reference](docs/api.md) — endpoints, auth, examples

## License

GPL-3.0 — see [LICENSE](LICENSE).
