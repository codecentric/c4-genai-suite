FROM python:3.13-slim AS builder

WORKDIR /app

COPY pyproject.toml uv.lock ./

RUN pip install uv
RUN uv sync --locked

FROM python:3.13-slim

WORKDIR /app

COPY --from=builder /app/.venv /app/.venv
COPY confluence_importer/ confluence_importer/

COPY main.py .

ENV VIRTUAL_ENV=/app/.venv \
PATH="/app/.venv/bin:$PATH"

CMD ["python", "main.py"]
