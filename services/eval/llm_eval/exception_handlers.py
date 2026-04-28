import sys

from fastapi import Request
from fastapi.responses import JSONResponse, PlainTextResponse
from loguru import logger


async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    host = getattr(getattr(request, "client", None), "host", None)
    port = getattr(getattr(request, "client", None), "port", None)
    url = (
        f"{request.url.path}?{request.query_params}"
        if request.query_params
        else request.url.path
    )
    exception_type, exception_value, exception_traceback = sys.exc_info()
    exception_name = getattr(exception_type, "__name__", None)
    logger.opt(exception=exc).error(
        f'{host}:{port} - "{request.method} {url}" 500 Internal Server Error '
        f"<{exception_name}: {exception_value}>"
    )
    # TODO the unmatched return type should be resolved
    return PlainTextResponse(status_code=500, content="Internal Server Error")
