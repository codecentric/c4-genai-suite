import asyncio
import typing
from contextlib import asynccontextmanager
from os import environ
from typing import AsyncGenerator

# IMPORTANT: Load environment variables FIRST before any other imports
# This ensures .env is loaded before SETTINGS object is created
from llm_eval.utils.env import load_env

load_env()

# flake8: noqa: E402
import time
from fastapi import FastAPI, Request, Response, status
from fastapi.routing import APIRoute
from loguru import logger

from llm_eval.database.migration import run_migrations_async
from llm_eval.dashboard.router import router as dashboard_router
from llm_eval.db import engine
from llm_eval.eval.router import router as eval_router
from llm_eval.exception_handlers import unhandled_exception_handler
from llm_eval.llm_endpoints.router import router as llm_endpoints_router
from llm_eval.metrics.router import router as metric_router
from llm_eval.qa_catalog.router import router as qa_catalog_router
from llm_eval.utils.data_dir import setup_data_dir
from llm_eval.utils.ssl import setup_custom_ssl_cert

setup_data_dir()
setup_custom_ssl_cert()


@asynccontextmanager
async def lifespan(_: FastAPI) -> AsyncGenerator[None, None]:
    try:
        # Add 60-second timeout for migrations
        async with asyncio.timeout(60):
            logger.info("Starting database migrations...")
            await run_migrations_async(engine)
            logger.info("Database migrations completed successfully")
    except asyncio.TimeoutError:
        logger.error("Database migrations timed out after 60 seconds")
        raise RuntimeError(
            "Database migrations timed out - check database connectivity"
        )
    except Exception as e:
        logger.error(f"Database migration failed: {e}")
        raise
    yield


app = FastAPI(
    lifespan=lifespan,
    title="LLM Eval Service",
    description="Internal evaluation service for C4 GenAI Suite",
    version="1.0.0",
)
app.add_exception_handler(Exception, unhandled_exception_handler)


@app.middleware("http")
async def log_requests(
    request: Request, call_next: typing.Callable[[Request], typing.Awaitable[Response]]
) -> Response:
    """Log all incoming requests and responses with timing and error details."""
    start_time = time.time()

    # Log incoming request
    logger.info(
        f"Incoming request: {request.method} {request.url.path}"
        f" | Query: {dict(request.query_params)}"
        f" | Client: {request.client.host if request.client else 'unknown'}"
    )

    # Log relevant headers (excluding sensitive ones)
    allowed_headers = [
        "content-type",
        "user-agent",
        "x-user-id",
        "x-user-email",
        "x-user-name",
    ]
    headers_to_log = {
        k: v for k, v in request.headers.items() if k.lower() in allowed_headers
    }
    if headers_to_log:
        logger.debug(f"Headers: {headers_to_log}")

    try:
        # Process request
        response = await call_next(request)

        # Calculate duration
        duration = time.time() - start_time

        # Log response
        log_level = "info" if response.status_code < 400 else "error"
        getattr(logger, log_level)(
            f"Request completed: {request.method} {request.url.path}"
            f" | Status: {response.status_code}"
            f" | Duration: {duration:.3f}s"
        )

        return response

    except Exception as e:
        # Log error with full details
        duration = time.time() - start_time
        logger.error(
            f"Request failed: {request.method} {request.url.path}"
            f" | Error: {type(e).__name__}: {str(e)}"
            f" | Duration: {duration:.3f}s"
        )
        raise


@app.get("/health", status_code=status.HTTP_200_OK, tags=["healthcheck"])
def health() -> Response:
    return Response(environ.get("APP_VERSION"))


# NOTE: No authentication - this is an internal trusted service
# Authentication is handled by the C4 backend which proxies requests here
# User context can optionally be passed via X-User-* headers

app.include_router(eval_router, prefix="/v1")
app.include_router(dashboard_router, prefix="/v1")
app.include_router(qa_catalog_router, prefix="/v1")
app.include_router(llm_endpoints_router, prefix="/v1")
app.include_router(metric_router, prefix="/v1")


# noinspection PyShadowingNames
def build_operation_ids(app: FastAPI) -> None:
    for route in app.routes:
        if isinstance(route, APIRoute):
            route.operation_id = f"{'_'.join(route.tags)}_{route.name}"


build_operation_ids(app)
