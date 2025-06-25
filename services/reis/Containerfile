FROM python:3.13-bookworm AS builder

# Create app directory
WORKDIR /reis

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
RUN poetry install --without dev --no-root && rm -rf $POETRY_CACHE_DIR

#
# RUNTIME
#
FROM python:3.13-slim-bookworm AS production

# we need this library for psycopg and extracting audio streams from videos
RUN apt-get update \
&& apt-get -y install libpq5=15.13-0+deb12u1 ffmpeg=7:5.1.6-0+deb12u1

ENV VIRTUAL_ENV=/reis/.venv \
PATH="/reis/.venv/bin:$PATH"

COPY --from=builder ${VIRTUAL_ENV} ${VIRTUAL_ENV}

COPY rei_s ./rei_s
COPY logging.conf logging.conf

# download necessary files for unstructured
ENV TIKTOKEN_CACHE_DIR="/tiktoken_cache"
ENV NLTK_DATA="/nltk_data"
RUN mkdir -p ${NLTK_DATA} && python rei_s/prepare.py

EXPOSE 3201

HEALTHCHECK CMD python3 -c "import urllib.request, sys; sys.exit(0) if urllib.request.urlopen('http://localhost:3201/health').status == 200 else sys.exit(1)" || exit 1

# At the moment azure-search-documents gives use warning, disable to keep the logs in clean json format
ENV PYTHONWARNINGS="ignore:invalid escape sequence"
ENV HOST=0.0.0.0

# The fastapi command does not support logging config so use uvicorn instead
CMD ["sh", "-c", "HOST=${HOST:-0.0.0.0}; uvicorn rei_s.app:app --proxy-headers --port 3201 --host \"$HOST\" --log-config logging.conf"]
