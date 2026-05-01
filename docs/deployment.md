# Deployment

## Docker compose (recommended)

```bash
cp .env.example .env
# Generate a strong secret:
python -c 'import secrets; print(secrets.token_urlsafe(48))'
# Paste that into WARMAI_SECRET_KEY.
docker compose up -d --build
```

The stack spins up:

- `mongo` — MongoDB 7 with a named volume `mongo_data`.
- `backend` — FastAPI + scheduler. User-uploaded CSVs persist in `backend_data`.
- `frontend` — Next.js standalone build.

Healthchecks are defined for both `mongo` and `backend`; the frontend depends
on the backend, the backend depends on a healthy mongo.

## Production checklist

- [ ] `WARMAI_ENVIRONMENT=production`
- [ ] `WARMAI_LOG_FORMAT=json`
- [ ] Strong `WARMAI_SECRET_KEY` (≥ 48 random bytes)
- [ ] Restricted `WARMAI_CORS_ORIGINS` (no `*`)
- [ ] `WARMAI_WARMUP_RECIPIENT_OVERRIDE` is **empty** (real recipients)
- [ ] `WARMAI_SIGNUP_ACCESS_CODE` is unique and shared only with intended users
- [ ] Mongo is locked down (auth, network policy, backups)
- [ ] TLS in front of the frontend and backend (e.g. via Caddy or nginx)

## Reverse proxy

The backend defaults to listening on `0.0.0.0:8080` and the frontend on
`0.0.0.0:3000`. Front them with Caddy, nginx, Traefik, or any other reverse
proxy that terminates TLS. The frontend reads `NEXT_PUBLIC_API_URL` at build
time, so rebuild the image when the public URL changes.

## Scaling

The scheduler must run in a single process — it owns the job locks. To scale
the API horizontally, split it into:

1. A scheduler instance (1 replica, runs `python -m app`).
2. Stateless API replicas with the scheduler disabled. Add a setting
   `WARMAI_DISABLE_SCHEDULER=true` (TODO) and skip `start_scheduler()` in
   `lifespan`.

Until that flag is wired up, run a single backend container.
