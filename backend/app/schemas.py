"""Request/response Pydantic schemas. Camel-cased over the wire."""

from __future__ import annotations

from typing import Literal

from beanie import PydanticObjectId
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models import EmailListType, MailServerSecurity, WarmupState
from app.utils import to_camel_case

camel = ConfigDict(
    str_strip_whitespace=True,
    use_enum_values=True,
    alias_generator=to_camel_case,
    populate_by_name=True,
)


class _Base(BaseModel):
    model_config = camel


# ---------- generic ----------


class GenericMessage(_Base):
    message: str
    description: str = ""


class ErrorResponse(_Base):
    message: str
    description: str = ""


# ---------- auth / users ----------


class SignupRequest(_Base):
    username: str = Field(min_length=2, max_length=64)
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    fullname: str = Field(min_length=1, max_length=128)
    access_code: str


class TokenResponse(_Base):
    access_token: str
    token_type: str = "bearer"
    user_id: PydanticObjectId


class UserResponse(_Base):
    id: PydanticObjectId = Field(alias="_id")
    username: str
    email: str
    fullname: str
    created_at: int


# ---------- mail servers ----------


class MailServerCreate(_Base):
    name: str = Field(min_length=1, max_length=64)
    smtp_hostname: str
    smtp_port: int = Field(ge=1, le=65535)
    smtp_email: EmailStr
    smtp_password: str
    smtp_security: MailServerSecurity = "tls"


class MailServerUpdate(MailServerCreate):
    pass


class MailServerResponse(_Base):
    id: PydanticObjectId = Field(alias="_id")
    name: str
    smtp_hostname: str
    smtp_port: int
    smtp_email: str
    smtp_security: MailServerSecurity
    added_on: int
    last_modified: int


class MailServerVerifyRequest(_Base):
    hostname: str
    port: int = Field(ge=1, le=65535)
    email: EmailStr
    password: str
    security: MailServerSecurity = "tls"
    recipient_email: EmailStr


class MailServerVerifyResponse(_Base):
    status: Literal["success", "failed"]
    message: str


class IdsRequest(_Base):
    ids: list[str] = Field(min_length=1, max_length=500)


class DeleteResult(_Base):
    deleted: int


# ---------- email lists ----------


class EmailListResponse(_Base):
    id: PydanticObjectId = Field(alias="_id")
    name: str
    email_list_type: EmailListType
    total_emails: int
    created_at: int
    last_modified: int
    url: str


class EmailListPage(_Base):
    total: int
    page_size: int
    items: list[EmailListResponse]


# ---------- warmups ----------


class WarmupCreate(_Base):
    name: str = Field(min_length=1, max_length=64)
    mailserver_id: str
    client_email_list_id: str | None = None
    reply_email_list_id: str | None = None
    max_days: int = Field(default=0, ge=0, le=365)
    increase_rate: float = Field(ge=0.1, le=20)
    start_volume: int = Field(ge=10, le=200)
    daily_send_limit: int = Field(ge=10, le=1_000_000)
    auto_responder_enabled: bool = False
    target_open_rate: float = Field(ge=0.0, le=1.0, default=0.5)
    target_reply_rate: float = Field(ge=0.0, le=1.0, default=0.3)
    scheduled_at: int = 0


class WarmupResponse(_Base):
    id: PydanticObjectId = Field(alias="_id")
    name: str
    state: WarmupState
    status_text: str | None
    mailserver_id: PydanticObjectId
    mailserver_name: str | None = None
    client_email_list_id: PydanticObjectId | None = None
    client_email_list_name: str | None = None
    reply_email_list_id: PydanticObjectId | None = None
    reply_email_list_name: str | None = None
    max_days: int
    increase_rate: float
    start_volume: int
    daily_send_limit: int
    auto_responder_enabled: bool
    target_open_rate: float
    target_reply_rate: float
    current_warmup_day: int
    total_warmup_days: int
    total_addresses_mailed: int
    created_at: int
    started_at: int
    scheduled_at: int


class WarmupPage(_Base):
    total: int
    page_size: int
    items: list[WarmupResponse]


class WarmupStateUpdate(_Base):
    ids: list[str] = Field(min_length=1)
    action: Literal["pause", "resume"]


class UpdateResult(_Base):
    updated: int
