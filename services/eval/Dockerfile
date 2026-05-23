FROM python:3.12-slim AS builder

WORKDIR /eval

RUN apt-get update && \
    apt-get install --no-install-recommends -y \
    build-essential && \
    rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy

# Copy dependency files first for caching
COPY pyproject.toml uv.lock ./

# Install dependencies (no dev, no project itself yet)
RUN uv sync --frozen --no-install-project --no-dev

#
# RUNTIME
#
FROM python:3.12-slim AS production

ARG VERSION

ENV RUN_IN_CONTAINER=true \
    APP_VERSION=${VERSION} \
    VIRTUAL_ENV=/eval/.venv \
    PATH="/eval/.venv/bin:$PATH"

WORKDIR /eval

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

# Copy application code
COPY llm_eval ./llm_eval

EXPOSE 3202

HEALTHCHECK CMD python3 -c "import urllib.request, sys; sys.exit(0) if urllib.request.urlopen('http://localhost:3202/health').status == 200 else sys.exit(1)" || exit 1

ENV HOST=0.0.0.0

CMD ["sh", "-c", "HOST=${HOST:-0.0.0.0}; uvicorn llm_eval.main:app --proxy-headers --port 3202 --host \"$HOST\""]
