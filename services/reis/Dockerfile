FROM python:3.13-alpine3.22 AS builder

WORKDIR /reis

RUN apk add --no-cache build-base=0.5-r3 linux-headers=6.14.2-r0 rust=1.87.0-r0 cargo=1.87.0-r0

RUN pip install poetry


ENV POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_IN_PROJECT=1 \
    POETRY_VIRTUALENVS_CREATE=1 \
    POETRY_CACHE_DIR=/tmp/poetry_cache

# Copy the deps and lockfile to use caching.
COPY pyproject.toml poetry.lock ./
# poetry will complain about a missing readme
RUN touch README.md

# install from the lockfile without the project files
RUN poetry install --without dev --no-root && \
    rm -rf $POETRY_CACHE_DIR

# Remove unnecessary files from virtualenv to reduce size
RUN find /reis/.venv -name "*.pyc" -delete && \
    find /reis/.venv -name "*.pyo" -delete && \
    find /reis/.venv -name "*.pyd" -delete && \
    find /reis/.venv -name "__pycache__" -type d -exec rm -rf {} + 2>/dev/null || true && \
    find /reis/.venv -name "*.c" -delete && \
    find /reis/.venv -name "*.h" -delete

#
# RUNTIME
#
FROM python:3.13-alpine3.22 AS production

# we need this library for extracting audio streams from videos
RUN apk add --no-cache ffmpeg=6.1.2-r2

ENV VIRTUAL_ENV=/reis/.venv \
PATH="/reis/.venv/bin:$PATH"

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

COPY rei_s ./rei_s
COPY logging.conf logging.conf

# download necessary files for unstructured
ENV TIKTOKEN_CACHE_DIR="/tiktoken_cache" \
NLTK_DATA="/nltk_data"
RUN mkdir -p ${NLTK_DATA} && python3 rei_s/prepare.py

EXPOSE 3201

HEALTHCHECK CMD python3 -c "import urllib.request, sys; sys.exit(0) if urllib.request.urlopen('http://localhost:3201/health').status == 200 else sys.exit(1)" || exit 1

# At the moment azure-search-documents gives use warning, disable to keep the logs in clean json format
ENV PYTHONWARNINGS="ignore:invalid escape sequence" \
HOST=0.0.0.0

# The fastapi command does not support logging config so use uvicorn instead
CMD ["sh", "-c", "HOST=${HOST:-0.0.0.0}; uvicorn rei_s.app:app --proxy-headers --port 3201 --host \"$HOST\" --log-config logging.conf"]
