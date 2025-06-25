from fastapi import FastAPI
from prometheus_fastapi_instrumentator import Instrumentator

from rei_s.utils import lifespan
from rei_s.routes import files, health


def create() -> FastAPI:
    app = FastAPI(lifespan=lifespan)
    app.include_router(files.router)
    app.include_router(health.router)
    Instrumentator().instrument(app)

    return app
