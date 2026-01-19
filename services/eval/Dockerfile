# `python-base` sets up all our shared environment variables
FROM python:3.12.5-slim AS python-base

# python
ENV PYTHONUNBUFFERED=1 \
    # prevents python creating .pyc files
    PYTHONDONTWRITEBYTECODE=1 \
    \
    # pip
    PIP_NO_CACHE_DIR=off \
    PIP_DISABLE_PIP_VERSION_CHECK=on \
    PIP_DEFAULT_TIMEOUT=100 \
    \
    # poetry
    # https://python-poetry.org/docs/configuration/#using-environment-variables
    POETRY_VERSION=2.1.1 \
    # make poetry install to this location
    POETRY_HOME="/opt/poetry" \
    # do not ask any interactive question
    POETRY_NO_INTERACTION=1 \
    \
    # paths
    # this is where our requirements + virtual environment will live
    PYSETUP_PATH="/opt/pysetup/"

# prepend poetry and venv to path
ENV PATH="$POETRY_HOME/bin:$PATH"


# `builder-base` stage is used to create the virtual environment
FROM python-base AS builder-base

RUN apt-get update \
    && apt-get install --no-install-recommends -y \
    # deps for installing poetry
    curl \
    # deps for building python deps
    build-essential

# install poetry - respects $POETRY_VERSION & $POETRY_HOME
RUN curl -sSL https://install.python-poetry.org | python3 -
# install poetry bundle plugin
RUN poetry self add poetry-plugin-bundle@1.7.0

WORKDIR $PYSETUP_PATH

COPY . .

# bundle project
RUN poetry bundle venv --only=main /venv


FROM python-base AS runtime

ARG VERSION

ENV RUN_IN_CONTAINER=true

ENV APP_VERSION=${VERSION}

WORKDIR $PYSETUP_PATH

COPY --from=builder-base /venv /venv
