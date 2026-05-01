from __future__ import annotations

import random
import re
import string
from datetime import UTC, datetime
from uuid import uuid4

from beanie import PydanticObjectId
from bson.errors import InvalidId


def utc_now_ts() -> int:
    return int(datetime.now(UTC).timestamp())


def to_camel_case(snake: str) -> str:
    parts = snake.split("_")
    return parts[0] + "".join(p.capitalize() for p in parts[1:])


def parse_object_id(value: str | None) -> PydanticObjectId | None:
    if not value:
        return None
    try:
        return PydanticObjectId(value)
    except (InvalidId, ValueError):
        return None


def parse_object_ids(values: list[str] | None) -> list[PydanticObjectId]:
    if not values:
        return []
    out: list[PydanticObjectId] = []
    for v in values:
        oid = parse_object_id(v)
        if oid is not None:
            out.append(oid)
    return out


def random_token(length: int = 16) -> str:
    return "".join(random.choices(string.ascii_letters + string.digits, k=length))


def uid() -> str:
    return uuid4().hex


_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_\- ]{1,64}$")


def safe_name(name: str) -> bool:
    return bool(_NAME_PATTERN.match(name))
