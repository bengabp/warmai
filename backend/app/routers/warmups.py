from __future__ import annotations

from typing import Annotated

from beanie.operators import In, Set
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.models import EmailList, MailServer, User, Warmup, WarmupDay, WarmupState
from app.schemas import (
    DeleteResult,
    IdsRequest,
    UpdateResult,
    WarmupCreate,
    WarmupPage,
    WarmupResponse,
    WarmupStateUpdate,
)
from app.scheduler import remove_warmup, schedule_warmup
from app.security import get_current_user
from app.utils import parse_object_id, parse_object_ids, utc_now_ts

router = APIRouter(prefix="/warmups", tags=["warmups"])


async def _hydrate(warmup: Warmup) -> WarmupResponse:
    """Pull related names + warmup-day count in parallel for the response."""
    mail_server = await MailServer.get(warmup.mailserver_id)
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
    total_days = await WarmupDay.find(WarmupDay.warmup_id == warmup.id).count()

    data = warmup.model_dump()
    data["mailserver_name"] = mail_server.name if mail_server else None
    data["client_email_list_name"] = client_list.name if client_list else None
    data["reply_email_list_name"] = reply_list.name if reply_list else None
    data["total_warmup_days"] = total_days
    data["total_addresses_mailed"] = len(warmup.addresses_mailed)
    return WarmupResponse.model_validate(data)


@router.post("", status_code=status.HTTP_201_CREATED, response_model=WarmupResponse)
async def create_warmup(
    req: WarmupCreate, user: Annotated[User, Depends(get_current_user)]
):
    if await Warmup.find_one(Warmup.user_id == user.id, Warmup.name == req.name):
        raise HTTPException(status.HTTP_409_CONFLICT, f"Warmup '{req.name}' already exists")

    ms_id = parse_object_id(req.mailserver_id)
    if not ms_id or not await MailServer.find_one(
        MailServer.id == ms_id, MailServer.user_id == user.id
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid mailserverId")

    client_id = parse_object_id(req.client_email_list_id)
    reply_id = parse_object_id(req.reply_email_list_id)

    if req.auto_responder_enabled and not reply_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "replyEmailListId required when autoResponderEnabled is true",
        )
    if not req.auto_responder_enabled and not client_id:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "clientEmailListId required when autoResponderEnabled is false",
        )

    warmup = Warmup(
        name=req.name,
        user_id=user.id,
        mailserver_id=ms_id,
        client_email_list_id=client_id,
        reply_email_list_id=reply_id,
        max_days=req.max_days,
        increase_rate=req.increase_rate,
        start_volume=req.start_volume,
        daily_send_limit=req.daily_send_limit,
        auto_responder_enabled=req.auto_responder_enabled,
        target_open_rate=req.target_open_rate,
        target_reply_rate=req.target_reply_rate,
        scheduled_at=req.scheduled_at or utc_now_ts(),
    )
    await warmup.insert()

    try:
        schedule_warmup(warmup.id, warmup.scheduled_at)
    except Exception:
        # Roll back the doc if scheduling fails — keeps state consistent.
        await warmup.delete()
        raise

    return await _hydrate(warmup)


@router.get("", response_model=WarmupPage)
async def list_warmups(
    user: Annotated[User, Depends(get_current_user)],
    name: str | None = Query(default=None),
    state: WarmupState | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=30, ge=1, le=200),
):
    query = Warmup.user_id == user.id
    if name:
        query = query & (Warmup.name == name)
    if state:
        query = query & (Warmup.state == state)
    cursor = Warmup.find(query)
    total = await cursor.count()
    items = await cursor.skip(skip).limit(limit).to_list()
    hydrated = [await _hydrate(w) for w in items]
    return WarmupPage(total=total, page_size=limit, items=hydrated)


@router.get("/{warmup_id}", response_model=WarmupResponse)
async def get_warmup(warmup_id: str, user: Annotated[User, Depends(get_current_user)]):
    oid = parse_object_id(warmup_id)
    if not oid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")
    warmup = await Warmup.find_one(Warmup.id == oid, Warmup.user_id == user.id)
    if not warmup:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Warmup not found")
    return await _hydrate(warmup)


@router.post("/state", response_model=UpdateResult)
async def update_state(
    req: WarmupStateUpdate, user: Annotated[User, Depends(get_current_user)]
):
    new_state: WarmupState = "paused" if req.action == "pause" else "running"
    oids = parse_object_ids(req.ids)
    res = await Warmup.find(
        Warmup.user_id == user.id, In(Warmup.id, oids)
    ).update(Set({Warmup.state: new_state}))

    # Re-sync APScheduler so paused warmups stop running.
    if req.action == "pause":
        for oid in oids:
            remove_warmup(oid)
    else:
        for oid in oids:
            warmup = await Warmup.get(oid)
            if warmup:
                schedule_warmup(warmup.id, warmup.scheduled_at)

    return UpdateResult(updated=res.modified_count if res else 0)


@router.post("/delete", response_model=DeleteResult)
async def delete_warmups(
    req: IdsRequest, user: Annotated[User, Depends(get_current_user)]
):
    oids = parse_object_ids(req.ids)
    for oid in oids:
        remove_warmup(oid)
    res = await Warmup.find(
        Warmup.user_id == user.id, In(Warmup.id, oids)
    ).delete()
    # Cascade-delete days so they don't orphan
    await WarmupDay.find(In(WarmupDay.warmup_id, oids)).delete()
    return DeleteResult(deleted=res.deleted_count if res else 0)
