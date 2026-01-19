import uuid
from collections.abc import AsyncGenerator

import pytest_asyncio
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy_utils import create_database, drop_database

from llm_eval.database.migration import run_migrations_async
from llm_eval.settings import SETTINGS


@pytest_asyncio.fixture(scope="function")
async def test_session() -> AsyncGenerator[AsyncSession]:
    hash = str(uuid.uuid4())[:8]
    connection_string_sync = build_test_url(SETTINGS.connection_string_sync, hash)

    create_database(connection_string_sync)

    session = None

    try:
        engine = create_async_engine(
            build_test_url(SETTINGS.connection_string, hash), poolclass=NullPool
        )
        await run_migrations_async(engine)
        session = AsyncSession(engine)
        await session.begin()

        yield session
    finally:
        if session:
            await session.close()
        drop_database(connection_string_sync)


def build_test_url(url: str, hash: str) -> str:
    return ("/").join(url.split("/")[:-1] + [f"test_db_{hash}"])
