import logging
from types import TracebackType
import orjson
from datetime import datetime, timezone
import traceback


class JsonFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        timestamp = datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat() + "Z"

        log_obj = {
            "context": record.module,
            "level": record.levelname.lower(),
            "message": record.getMessage(),
            "timestamp": timestamp,
        }

        if record.exc_info:
            log_obj["stack"] = self.format_exception(record.exc_info)

        return orjson.dumps(log_obj).decode()

    def format_exception(
        self, exc_info: tuple[type[BaseException], BaseException, TracebackType | None] | tuple[None, None, None]
    ) -> str:
        return "".join(traceback.format_exception(*exc_info))
