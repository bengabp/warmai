from __future__ import annotations

from beanie import init_beanie
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.logging import get_logger
from app.models import EmailList, MailServer, User, Warmup, WarmupDay, WarmupTemplate
from app.settings import settings

logger = get_logger("app.db")

ALL_MODELS = [User, EmailList, MailServer, Warmup, WarmupDay, WarmupTemplate]

_client: AsyncIOMotorClient | None = None


async def init_db() -> AsyncIOMotorDatabase:
    """Initialize the mongo connection and Beanie ODM. Idempotent."""
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(settings.MONGODB_URL)
        logger.info("mongo_connected", db=settings.MONGODB_DB)
    db = _client[settings.MONGODB_DB]
    await init_beanie(database=db, document_models=ALL_MODELS)
    return db


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None
        logger.info("mongo_disconnected")


def get_client() -> AsyncIOMotorClient:
    if _client is None:
        raise RuntimeError("Mongo client not initialized — call init_db() first")
    return _client
