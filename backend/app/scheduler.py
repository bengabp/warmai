"""In-process AsyncIO scheduler — replaces the old RPYC + bunnet worker.

The scheduler runs inside the FastAPI app via the lifespan hook, so the API and
job execution share one process and one Mongo connection. APScheduler persists
jobs in Mongo so they survive restarts.
"""

from __future__ import annotations

import asyncio
from datetime import UTC, datetime

from apscheduler.jobstores.mongodb import MongoDBJobStore
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.interval import IntervalTrigger
from beanie import PydanticObjectId

from app.db import get_client
from app.logging import get_logger
from app.mailer import SmtpConfig, send_html
from app.models import EmailList, MailServer, Warmup, WarmupDay
from app.settings import settings
from app.utils import random_token, utc_now_ts

logger = get_logger("app.scheduler")

_scheduler: AsyncIOScheduler | None = None


def get_scheduler() -> AsyncIOScheduler:
    if _scheduler is None:
        raise RuntimeError("Scheduler not started")
    return _scheduler


def start_scheduler() -> AsyncIOScheduler:
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    jobstore = MongoDBJobStore(database=settings.MONGODB_DB, collection="scheduler_jobs",
                               client=get_client().delegate)
    _scheduler = AsyncIOScheduler(jobstores={"default": jobstore})
    _scheduler.start()
    logger.info("scheduler_started")
    return _scheduler


def stop_scheduler() -> None:
    global _scheduler
    if _scheduler is not None:
        _scheduler.shutdown(wait=False)
        _scheduler = None
        logger.info("scheduler_stopped")


def _interval() -> IntervalTrigger:
    if settings.SCHEDULER_INTERVAL_SECONDS > 0:
        return IntervalTrigger(seconds=settings.SCHEDULER_INTERVAL_SECONDS)
    return IntervalTrigger(seconds=30) if not settings.is_production else IntervalTrigger(days=1)


def schedule_warmup(warmup_id: PydanticObjectId, scheduled_at: int) -> None:
    """Add or replace the recurring job for a warmup."""
    sched = get_scheduler()
    next_run = datetime.fromtimestamp(max(scheduled_at, utc_now_ts()), tz=UTC)
    sched.add_job(
        run_warmup_tick,
        trigger=_interval(),
        id=str(warmup_id),
        replace_existing=True,
        next_run_time=next_run,
        kwargs={"warmup_id": str(warmup_id)},
    )
    logger.info("warmup_scheduled", warmup_id=str(warmup_id), next_run=next_run.isoformat())


def remove_warmup(warmup_id: PydanticObjectId | str) -> None:
    sched = get_scheduler()
    try:
        sched.remove_job(str(warmup_id))
    except Exception as exc:
        logger.debug("remove_job_failed", warmup_id=str(warmup_id), error=str(exc))


async def reconcile_jobs() -> None:
    """On startup, re-schedule every warmup that isn't completed/failed."""
    sched = get_scheduler()
    existing = {job.id for job in sched.get_jobs()}

    count = 0
    async for warmup in Warmup.find(Warmup.state != "completed", Warmup.state != "failed"):
        wid = str(warmup.id)
        if wid in existing:
            continue
        schedule_warmup(warmup.id, warmup.scheduled_at)
        count += 1
    logger.info("reconcile_done", scheduled=count)


def _next_send_volume(warmup: Warmup, last_volume: int | None) -> int:
    if warmup.current_warmup_day <= 0 or last_volume is None:
        return warmup.start_volume
    if 0.1 <= warmup.increase_rate < 1:
        return min(warmup.daily_send_limit, last_volume + round(warmup.increase_rate * last_volume))
    if warmup.increase_rate >= 1:
        return min(warmup.daily_send_limit, last_volume + int(warmup.increase_rate))
    return warmup.start_volume


async def run_warmup_tick(warmup_id: str) -> None:
    """One day's worth of work for a warmup. Idempotent — safe to retry."""
    log = logger.bind(warmup_id=warmup_id)
    warmup = await Warmup.get(PydanticObjectId(warmup_id))
    if warmup is None:
        log.info("warmup_gone_removing_job")
        remove_warmup(warmup_id)
        return

    if warmup.state == "paused":
        log.info("warmup_paused")
        return

    if warmup.max_days and warmup.current_warmup_day >= warmup.max_days:
        warmup.state = "completed"
        warmup.status_text = "Warmup completed"
        await warmup.save()
        remove_warmup(warmup_id)
        log.info("warmup_completed")
        return

    mail_server = await MailServer.get(warmup.mailserver_id)
    if mail_server is None:
        warmup.state = "failed"
        warmup.status_text = "Mail server missing"
        await warmup.save()
        log.warning("warmup_failed_missing_mailserver")
        return

    client_list = (
        await EmailList.get(warmup.client_email_list_id)
        if warmup.client_email_list_id
        else None
    )
    reply_list = (
        await EmailList.get(warmup.reply_email_list_id)
        if warmup.reply_email_list_id
        else None
    )

    if warmup.auto_responder_enabled and reply_list is None:
        warmup.state = "failed"
        warmup.status_text = "Reply email list missing"
        await warmup.save()
        return

    if not warmup.auto_responder_enabled and client_list is None:
        warmup.state = "failed"
        warmup.status_text = "Client email list missing"
        await warmup.save()
        return

    last_day = (
        await WarmupDay.find(WarmupDay.warmup_id == warmup.id)
        .sort(-WarmupDay.nday)
        .limit(1)
        .to_list()
    )
    last_volume = last_day[0].actual_send_volume if last_day else None
    target = _next_send_volume(warmup, last_volume)

    pool = client_list.emails if client_list else (reply_list.emails if reply_list else [])
    seen = set(warmup.addresses_mailed)
    pending = [e for e in pool if e.get("email") and e["email"] not in seen][:target]

    if not pending:
        warmup.state = "failed"
        warmup.status_text = "Email list exhausted — add more addresses"
        await warmup.save()
        log.warning("warmup_failed_list_exhausted")
        return

    cfg = SmtpConfig(
        hostname=mail_server.smtp_hostname,
        port=mail_server.smtp_port,
        email=mail_server.smtp_email,
        password=mail_server.smtp_password,
        security=mail_server.smtp_security,
    )

    batch_id = random_token(12)
    sent: list[dict] = []
    for contact in pending:
        recipient = settings.WARMUP_RECIPIENT_OVERRIDE or contact["email"]
        result = await asyncio.to_thread(
            send_html,
            cfg,
            to_email=recipient,
            subject=f"Hello from {warmup.name}",
            body_html=f"<p>Greetings — this is a warmup message ({batch_id}).</p>",
            batch_id=batch_id,
        )
        if result.ok:
            sent.append(contact)

    warmup.current_warmup_day += 1
    warmup.addresses_mailed.extend(c["email"] for c in sent)
    warmup.state = "running"
    warmup.status_text = f"Day {warmup.current_warmup_day}: sent {len(sent)} / {len(pending)}"
    await warmup.save()

    await WarmupDay(
        warmup_id=warmup.id,
        nday=warmup.current_warmup_day,
        actual_send_volume=len(sent),
        state="completed",
        batch_id=batch_id,
        client_emails_sent=sent,
    ).insert()

    log.info("warmup_tick_complete", day=warmup.current_warmup_day, sent=len(sent))
