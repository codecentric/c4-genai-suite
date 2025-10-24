FROM ghcr.io/codecentric/c4-genai-suite/dev-helper/reis-dev-base-image:latest AS builder

WORKDIR /reis

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

#
# RUNTIME
#
FROM ghcr.io/codecentric/c4-genai-suite/dev-helper/reis-base-image:latest

ENV VIRTUAL_ENV=/reis/.venv \
PATH="/reis/.venv/bin:$PATH"

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

COPY rei_s ./rei_s
COPY logging.conf logging.conf

EXPOSE 3201

HEALTHCHECK CMD python3 -c "import urllib.request, sys; sys.exit(0) if urllib.request.urlopen('http://localhost:3201/health').status == 200 else sys.exit(1)" || exit 1

# At the moment azure-search-documents gives use warning, disable to keep the logs in clean json format
ENV PYTHONWARNINGS="ignore:invalid escape sequence" \
HOST=0.0.0.0

# The fastapi command does not support logging config so use uvicorn instead
CMD ["sh", "-c", "HOST=${HOST:-0.0.0.0}; uvicorn rei_s.app:app --proxy-headers --port 3201 --host \"$HOST\" --log-config logging.conf"]
