# Architecture

## Services

| Service  | Stack                            | Purpose                                        |
| -------- | -------------------------------- | ---------------------------------------------- |
| backend  | FastAPI + Beanie + APScheduler   | REST API and in-process recurring warmup jobs  |
| frontend | Next.js 16 (App Router) + shadcn | Web UI talking to the API                      |
| mongo    | MongoDB 7                        | Document store + APScheduler job persistence   |

The backend is a single Python process. The API and the scheduler share the
same async event loop and Mongo client — the previous version ran them as two
processes (FastAPI + a Bunnet/RPYC worker) that duplicated every model and
caused frequent drift. APScheduler's `MongoDBJobStore` keeps job state durable
across restarts.

## Request flow

1. Browser hits the Next.js frontend (`localhost:3000`).
2. Frontend calls the FastAPI backend (`localhost:8080/v1/...`) over JSON with
   a Bearer JWT.
3. Backend reads/writes Mongo through Beanie.
4. When a warmup is created, the API also adds an APScheduler job whose `id`
   is the warmup's ObjectId — so pause/resume/delete is just `add_job` /
   `remove_job` against the same id.

## Scheduler model

`app/scheduler.py`:

- `start_scheduler()` — boots `AsyncIOScheduler` with a `MongoDBJobStore`.
- `schedule_warmup(warmup_id, scheduled_at)` — adds (or replaces) a job that
  fires `run_warmup_tick(warmup_id)` once per day in production, every 30 s in
  development (override via `WARMAI_SCHEDULER_INTERVAL_SECONDS`).
- `reconcile_jobs()` — on startup, re-schedules every warmup that isn't
  `completed` or `failed`. Idempotent.
- `run_warmup_tick(warmup_id)` — one day's work: calculates the next send
  volume, picks unmailed recipients, calls `app.mailer.send_html` per contact,
  records a `WarmupDay` document.

## Data model

```
User ──< Warmup >── MailServer
              │
              ├── EmailList  (clientEmails or replyEmails)
              └── WarmupDay  (one per executed tick)

WarmupTemplate    ← shared pool sampled at send time
```

All documents live in their own collections; Beanie defines unique compound
indexes on `(user_id, name)` so users can't collide with themselves.

## Sources of truth

- **Models** — `backend/app/models.py`. One Beanie class per collection.
- **Settings** — `backend/app/settings.py`. Every config knob lives here.
- **API surface** — `backend/app/routers/*`. Routers compose pure CRUD.
- **Schemas** — `backend/app/schemas.py`. CamelCase response/request models.
- **Wire types** — `frontend/src/lib/types.ts`. Mirrors the backend response.

When the schema changes, update both `app/models.py` and
`frontend/src/lib/types.ts`. There is no auto-generated client.
