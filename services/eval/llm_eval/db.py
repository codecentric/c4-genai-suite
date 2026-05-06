from typing import Annotated, Any, AsyncGenerator

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm.exc import StaleDataError

from llm_eval.responses import entity_outdated
from llm_eval.settings import SETTINGS

engine = create_async_engine(
    SETTINGS.connection_string,
    connect_args={
        "timeout": 10,  # Connection timeout in seconds
        "command_timeout": 30,  # Command timeout in seconds
    },
    pool_pre_ping=True,  # Validate connections before use
    pool_size=10,  # Increase from default 5
    max_overflow=20,  # Increase from default 10
    echo=False,  # Set to True for SQL debugging
)
AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False)


class OptimisticLockingError(Exception):
    pass


async def get_db() -> AsyncGenerator[AsyncSession, Any]:
    try:
        async with AsyncSessionLocal.begin() as db:
            yield db
    except StaleDataError:
        raise entity_outdated()


SessionDep = Annotated[AsyncSession, Depends(get_db)]
NewSessionDep = Annotated[AsyncSession, Depends(get_db, use_cache=False)]
