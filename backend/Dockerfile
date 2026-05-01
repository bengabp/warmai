FROM ghcr.io/astral-sh/uv:0.5.13-python3.11-bookworm-slim AS base

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=never \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# --- deps stage: install dependencies first so they cache independently ---
FROM base AS deps
COPY pyproject.toml uv.lock* ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-install-project --no-dev || uv sync --no-install-project --no-dev

# --- runtime ---
FROM base AS runtime
COPY --from=deps /app/.venv /app/.venv
COPY pyproject.toml ./
COPY app ./app

ENV PATH="/app/.venv/bin:$PATH" \
    WARMAI_USER_FILES_DIR=/app/data/user_files

RUN useradd --system --uid 1001 --create-home --shell /usr/sbin/nologin warmai \
    && mkdir -p /app/data/user_files \
    && chown -R warmai:warmai /app
USER warmai

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD python -c "import urllib.request,sys; sys.exit(0 if urllib.request.urlopen('http://127.0.0.1:8080/health').status==200 else 1)" || exit 1

CMD ["python", "-m", "app"]
