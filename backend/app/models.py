"""Beanie document models — single source of truth for the schema.

Documents use Beanie's default snake_case + `_id` conventions so the ORM stays
happy. API responses are converted to camelCase via `app.schemas`.
"""

from __future__ import annotations

from typing import Literal

import pymongo
from beanie import Document, PydanticObjectId
from pydantic import Field

from app.utils import utc_now_ts

WarmupState = Literal["notStarted", "running", "completed", "failed", "paused"]
EmailListType = Literal["replyEmails", "clientEmails"]
MailServerSecurity = Literal["ssl", "tls", "unsecure"]

DAILY_EMAIL_SEND_LIMIT = 1_000_000


class User(Document):
    username: str
    email: str
    password: str = Field(description="Bcrypt hash")
    fullname: str
    created_at: int = Field(default_factory=utc_now_ts)

    class Settings:
        name = "users"
        indexes = [
            pymongo.IndexModel("username", unique=True),
            pymongo.IndexModel("email", unique=True),
        ]


class EmailList(Document):
    name: str
    user_id: PydanticObjectId
    email_list_type: EmailListType
    emails: list[dict] = Field(default_factory=list, description="[{email, password}]")
    created_at: int = Field(default_factory=utc_now_ts)
    last_modified: int = Field(default_factory=utc_now_ts)
    url: str

    class Settings:
        name = "email_lists"
        indexes = [
            pymongo.IndexModel([("user_id", 1), ("name", 1)], unique=True),
        ]


class MailServer(Document):
    name: str
    user_id: PydanticObjectId
    smtp_hostname: str
    smtp_port: int
    smtp_email: str
    smtp_password: str
    smtp_security: MailServerSecurity = "tls"
    added_on: int = Field(default_factory=utc_now_ts)
    last_modified: int = Field(default_factory=utc_now_ts)

    class Settings:
        name = "mail_servers"
        indexes = [
            pymongo.IndexModel([("user_id", 1), ("name", 1)], unique=True),
        ]


class Warmup(Document):
    name: str
    user_id: PydanticObjectId

    mailserver_id: PydanticObjectId
    client_email_list_id: PydanticObjectId | None = None
    reply_email_list_id: PydanticObjectId | None = None

    state: WarmupState = "notStarted"
    status_text: str | None = None

    max_days: int = Field(default=0, ge=0, description="0 = run forever")
    increase_rate: float = Field(ge=0.1, le=20)
    start_volume: int = Field(ge=10, le=200)
    daily_send_limit: int = Field(ge=10, le=DAILY_EMAIL_SEND_LIMIT)

    auto_responder_enabled: bool = False
    target_open_rate: float = Field(ge=0.0, le=1.0, default=0.5)
    target_reply_rate: float = Field(ge=0.0, le=1.0, default=0.3)

    addresses_mailed: list[str] = Field(default_factory=list)
    current_warmup_day: int = 0

    created_at: int = Field(default_factory=utc_now_ts)
    started_at: int = Field(default_factory=utc_now_ts)
    scheduled_at: int = Field(default_factory=utc_now_ts)

    class Settings:
        name = "warmups"
        indexes = [
            pymongo.IndexModel([("user_id", 1), ("name", 1)], unique=True),
            pymongo.IndexModel("state"),
        ]


class WarmupDay(Document):
    warmup_id: PydanticObjectId
    nday: int
    actual_send_volume: int = 0
    state: WarmupState = "completed"
    open_rate_score: float = 0.0
    reply_rate_score: float = 0.0
    reputation_score: float = 0.0
    batch_id: str
    client_emails_sent: list[dict] = Field(default_factory=list)
    reply_emails_sent: list[dict] = Field(default_factory=list)
    date: int = Field(default_factory=utc_now_ts)

    class Settings:
        name = "warmup_days"
        indexes = [pymongo.IndexModel([("warmup_id", 1), ("nday", -1)])]


class WarmupTemplate(Document):
    """Pool of subject + body templates sampled when sending warmup mail."""

    subject: str
    body: str
    responses: list[str] = Field(default_factory=list)

    class Settings:
        name = "warmup_templates"
        indexes = [pymongo.IndexModel("subject", unique=True)]
