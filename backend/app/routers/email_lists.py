from __future__ import annotations

from io import BytesIO
from typing import Annotated, Literal

import chardet
import pandas as pd
from beanie.operators import In
from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status

from app.models import EmailList, EmailListType, User
from app.schemas import (
    DeleteResult,
    EmailListPage,
    EmailListResponse,
    IdsRequest,
)
from app.security import get_current_user
from app.settings import settings
from app.utils import parse_object_id, parse_object_ids, random_token, utc_now_ts

router = APIRouter(prefix="/email-lists", tags=["email-lists"])

PAGE_SIZE = 30


def _to_response(el: EmailList) -> EmailListResponse:
    data = el.model_dump()
    data["total_emails"] = len(el.emails)
    return EmailListResponse.model_validate(data)


def _parse_csv(raw: bytes, *, require_password: bool) -> list[dict]:
    encoding = chardet.detect(raw)["encoding"] or "utf-8"
    df = pd.read_csv(BytesIO(raw), encoding=encoding)
    cols = set(df.columns.str.lower())
    if "email" not in cols:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "CSV must have an 'email' column")
    df.columns = [c.lower() for c in df.columns]
    if "password" not in df.columns:
        df["password"] = ""
    df = df.fillna("")
    if not df["email"].astype(bool).all():
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Some rows have no email")
    if require_password and not df["password"].astype(bool).all():
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Reply lists require a password for every row"
        )
    return [{"email": str(r["email"]).strip(), "password": str(r["password"])} for _, r in df.iterrows()]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=EmailListResponse)
async def create_email_list(
    user: Annotated[User, Depends(get_current_user)],
    name: str = Form(...),
    list_type: EmailListType = Form(..., alias="listType"),
    file: UploadFile = File(...),
):
    if await EmailList.find_one(EmailList.user_id == user.id, EmailList.name == name):
        raise HTTPException(status.HTTP_409_CONFLICT, f"List '{name}' already exists")

    raw = await file.read()
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "File is empty")

    emails = _parse_csv(raw, require_password=list_type == "replyEmails")

    user_dir = settings.USER_FILES_DIR / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{random_token(12)}.csv"
    (user_dir / filename).write_bytes(raw)

    el = EmailList(
        name=name,
        user_id=user.id,
        email_list_type=list_type,
        emails=emails,
        url=f"/files/{user.id}/{filename}",
    )
    await el.insert()
    return _to_response(el)


@router.get("", response_model=EmailListPage)
async def list_email_lists(
    user: Annotated[User, Depends(get_current_user)],
    list_type: Literal["replyEmails", "clientEmails"] | None = Query(default=None, alias="listType"),
    name: str | None = Query(default=None),
    skip: int = Query(default=0, ge=0),
    limit: int = Query(default=PAGE_SIZE, ge=1, le=200),
):
    query = EmailList.user_id == user.id
    if list_type:
        query = query & (EmailList.email_list_type == list_type)
    if name:
        query = query & (EmailList.name == name)
    cursor = EmailList.find(query)
    total = await cursor.count()
    items = await cursor.skip(skip).limit(limit).to_list()
    return EmailListPage(
        total=total,
        page_size=limit,
        items=[_to_response(e) for e in items],
    )


@router.put("/{list_id}", response_model=EmailListResponse)
async def update_email_list(
    list_id: str,
    user: Annotated[User, Depends(get_current_user)],
    name: str | None = Form(default=None),
    update_type: Literal["merge", "replace"] = Form(default="merge", alias="updateType"),
    file: UploadFile | None = File(default=None),
):
    oid = parse_object_id(list_id)
    if not oid:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid id")
    el = await EmailList.find_one(EmailList.id == oid, EmailList.user_id == user.id)
    if not el:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Email list not found")

    if name and name != el.name:
        if await EmailList.find_one(EmailList.user_id == user.id, EmailList.name == name):
            raise HTTPException(status.HTTP_409_CONFLICT, f"List '{name}' already exists")
        el.name = name

    if file:
        raw = await file.read()
        if raw:
            new_emails = _parse_csv(
                raw, require_password=el.email_list_type == "replyEmails"
            )
            if update_type == "replace":
                el.emails = new_emails
            else:  # merge — keep existing, append unseen by email
                seen = {e["email"] for e in el.emails}
                el.emails.extend(e for e in new_emails if e["email"] not in seen)

    el.last_modified = utc_now_ts()
    await el.save()
    return _to_response(el)


@router.post("/delete", response_model=DeleteResult)
async def delete_email_lists(
    req: IdsRequest, user: Annotated[User, Depends(get_current_user)]
):
    oids = parse_object_ids(req.ids)
    res = await EmailList.find(
        EmailList.user_id == user.id, In(EmailList.id, oids)
    ).delete()
    return DeleteResult(deleted=res.deleted_count if res else 0)
