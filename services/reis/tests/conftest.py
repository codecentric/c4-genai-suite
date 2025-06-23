from typing import Any, Generator
from fastapi import FastAPI
import pytest
from concurrent.futures import ThreadPoolExecutor

from rei_s import app_factory
from rei_s.config import Config, get_config


def get_test_config(settings: dict[str, Any] | None = None) -> Config:
    if settings is None:
        settings = {}

    config: dict[str, Any] = dict(
        _env_file=None,
        store_type="dev-null",
        embeddings_type="random-test-embeddings",
    )
    config.update(settings)
    return Config(**config)


def get_default_test_config() -> Config:
    return get_test_config()


# This will create a new app for every test module
# This way we can override the config without side effects outside of the test module
@pytest.fixture(scope="module")
def app() -> Generator[FastAPI, None, None]:
    app = app_factory.create()

    app.dependency_overrides[get_config] = get_default_test_config

    # the lifespan context is only evaluated when using the client as a context
    # this is good, because, we do not want to start the metrics endpoint for tests
    # but this means that we need to start the executor manually here.
    # For tests using the lifespan context, it will be overwritten.
    app.state.executor = ThreadPoolExecutor(max_workers=1)

    yield app


def pytest_addoption(parser: Any) -> None:
    parser.addoption("--stress", action="store_true", default=False, help="run stress tests")


def pytest_collection_modifyitems(config: Any, items: Any) -> None:
    if config.getoption("--stress"):
        # --stress given in cli: do not skip stress tests
        return
    items[:] = [item for item in items if "stress" not in item.keywords]


def pytest_configure(config: Any) -> None:
    config.addinivalue_line("markers", "stress: mark tests to run only on with --stress cli option")
