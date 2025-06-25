import logging
import multiprocessing as mp

from rei_s.logger_formatter import JsonFormatter
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.types.source_file import SourceFile


def init_subprocess_logger() -> None:
    """For initilizing the logging format in newly spawned processes"""
    logger = logging.getLogger("root")

    logger.setLevel("INFO")
    handler = logging.StreamHandler()
    handler.setFormatter(JsonFormatter())
    logger.addHandler(handler)


def process_file_in_process(
    format_: AbstractFormatProvider,
    file: SourceFile,
    chunk_size: int | None,
    queue: mp.Queue,  # type: ignore[type-arg]
) -> None:
    try:
        init_subprocess_logger()
        chunks = format_.process_file(file, chunk_size)
    except Exception as e:
        queue.put(e)
    else:
        queue.put(chunks)
