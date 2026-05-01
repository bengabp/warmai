"""Entrypoint: `python -m app` runs the API with embedded scheduler."""

from __future__ import annotations

import uvicorn

from app.settings import settings


def main() -> None:
    uvicorn.run(
        "app.api:app",
        host=settings.HOST,
        port=settings.PORT,
        log_level=settings.LOG_LEVEL.lower(),
        access_log=False,
        workers=1,  # scheduler must be single-process
    )


if __name__ == "__main__":
    main()
