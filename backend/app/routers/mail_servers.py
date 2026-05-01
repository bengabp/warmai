from __future__ import annotations

import asyncio
from typing import Annotated

from beanie.operators import In
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.mailer import SmtpConfig, verify_smtp
from app.models import MailServer, User
from app.schemas import (
    DeleteResult,
    IdsRequest,
    MailServerCreate,
    MailServerResponse,
    MailServerUpdate,
    MailServerVerifyRequest,
    MailServerVerifyResponse,
)
from app.security import get_current_user
from app.utils import parse_object_id, parse_object_ids, utc_now_ts

router = APIRouter(prefix="/mail-servers", tags=["mail-servers"])


def _to_response(ms: MailServer) -> MailServerResponse:
    return MailServerResponse.model_validate(ms.model_dump())


@router.post("", status_code=status.HTTP_201_CREATED, response_model=MailServerResponse)
async def create_mail_server(
    req: MailServerCreate, user: Annotated[User, Depends(get_current_user)]
):
    if await MailServer.find_one(MailServer.user_id == user.id, MailServer.name == req.name):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Mail server '{req.name}' already exists")
    ms = MailServer(user_id=user.id, **req.model_dump())
    await ms.insert()
    return _to_response(ms)


@router.get("", response_model=list[MailServerResponse])
async def list_mail_servers(
    user: Annotated[User, Depends(get_current_user)],
    name: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=50, ge=1, le=200),
):
    query = MailServer.user_id == user.id
    if name:
        query = query & (MailServer.name == name)
    items = await MailServer.find(query).skip(skip).limit(limit).to_list()
    return [_to_response(m) for m in items]


@router.put("/{ms_id}", response_model=MailServerResponse)
async def update_mail_server(
    ms_id: str, req: MailServerUpdate, user: Annotated[User, Depends(get_current_user)]
):
    oid = parse_object_id(ms_id)
    if not oid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")
    ms = await MailServer.find_one(MailServer.id == oid, MailServer.user_id == user.id)
    if not ms:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Mail server not found")

    if req.name != ms.name and await MailServer.find_one(
        MailServer.user_id == user.id, MailServer.name == req.name
    ):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Mail server '{req.name}' already exists")

    for field, value in req.model_dump().items():
        setattr(ms, field, value)
    ms.last_modified = utc_now_ts()
    await ms.save()
    return _to_response(ms)


@router.post("/delete", response_model=DeleteResult)
async def delete_mail_servers(
    req: IdsRequest, user: Annotated[User, Depends(get_current_user)]
):
    oids = parse_object_ids(req.ids)
    res = await MailServer.find(
        MailServer.user_id == user.id, In(MailServer.id, oids)
    ).delete()
    return DeleteResult(deleted=res.deleted_count if res else 0)


@router.post("/verify", response_model=MailServerVerifyResponse)
async def verify_mail_server(req: MailServerVerifyRequest):
    cfg = SmtpConfig(
        hostname=req.hostname,
        port=req.port,
        email=req.email,
        password=req.password,
        security=req.security,
    )
    result = await asyncio.to_thread(verify_smtp, cfg, req.recipient_email)
    return MailServerVerifyResponse(
        status="success" if result.ok else "failed",
        message=result.message,
    )
