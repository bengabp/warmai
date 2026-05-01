from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles

from app import __version__
from app.db import close_db, init_db
from app.logging import configure_logging, get_logger
from app.routers import auth, email_lists, mail_servers, warmups
from app.scheduler import reconcile_jobs, start_scheduler, stop_scheduler
from app.settings import ensure_directories, settings

logger = get_logger("app.api")


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    ensure_directories()
    await init_db()
    start_scheduler()
    await reconcile_jobs()
    logger.info("startup_complete")
    try:
        yield
    finally:
        stop_scheduler()
        await close_db()
        logger.info("shutdown_complete")


def create_app() -> FastAPI:
    app = FastAPI(
        title="WarmAI API",
        version=__version__,
        description="Email warmup automation",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.mount(
        "/files",
        StaticFiles(directory=str(settings.USER_FILES_DIR), check_dir=False),
        name="files",
    )

    prefix = settings.version_prefix
    app.include_router(auth.router, prefix=prefix)
    app.include_router(mail_servers.router, prefix=prefix)
    app.include_router(email_lists.router, prefix=prefix)
    app.include_router(warmups.router, prefix=prefix)

    @app.get("/health", tags=["meta"])
    async def health():
        return {"status": "ok", "version": __version__, "env": settings.ENVIRONMENT}

    @app.exception_handler(HTTPException)
    async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content={"message": str(exc.detail), "description": str(exc.detail)},
            headers=getattr(exc, "headers", None) or {},
        )

    @app.exception_handler(RequestValidationError)
    async def validation_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        return JSONResponse(
            status_code=422,
            content={
                "message": "Validation error",
                "description": "Request body did not pass validation",
                "details": jsonable_encoder(exc.errors(), exclude={"url", "type"}),
            },
        )

    return app


app = create_app()
