from typing import Any
from fastapi import FastAPI
from fastapi.concurrency import asynccontextmanager
from prometheus_fastapi_instrumentator import Instrumentator

from rei_s.utils import lifespan
from rei_s.routes import files, health
from rei_s.mcp import mcp_app


@asynccontextmanager
async def combined_lifespan(app: FastAPI) -> Any:
    async with lifespan(app):
        async with mcp_app.lifespan(app):
            yield


def create() -> FastAPI:
    app = FastAPI(lifespan=combined_lifespan)
    app.include_router(files.router)
    app.include_router(health.router)
    Instrumentator().instrument(app)

    app.mount("/", mcp_app)

    return app
