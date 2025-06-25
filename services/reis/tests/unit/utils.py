from contextlib import contextmanager
import os
from typing import Callable, Generator


def noop() -> None:
    pass


@contextmanager
def env_value(
    key: str,
    value: str,
    apply: Callable[[], None] = noop,
) -> Generator[None, None, None]:
    previous_value = os.getenv(key)
    os.environ[key] = value
    apply()

    yield

    if previous_value is None:
        del os.environ[key]
    else:
        os.environ[key] = previous_value
    apply()
