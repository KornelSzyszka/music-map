FROM python:3.12-slim

# uv is pinned to the version used for uv.lock.
COPY --from=ghcr.io/astral-sh/uv:0.11.18 /uv /usr/local/bin/uv

# The environment lives outside the source tree so a bind mount cannot hide it.
ENV UV_PROJECT_ENVIRONMENT=/opt/venv \
    UV_LINK_MODE=copy \
    PATH="/opt/venv/bin:$PATH" \
    PYTHONPATH=/app/pipeline/src \
    PYTHONUNBUFFERED=1

WORKDIR /app/pipeline

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project

COPY src ./src
COPY tests ./tests

# Default: run the checks from CONTRIBUTING.md. Override the command to run a stage.
CMD ["sh", "-c", "pytest && ruff check . && ruff format --check ."]
