from functools import wraps
from typing import Callable, ParamSpec, TypeVar, Concatenate, Awaitable

import anyio
from sqlalchemy import NullPool
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine

from llm_eval.settings import SETTINGS

Param = ParamSpec("Param")
RetType = TypeVar("RetType")


def with_session(
    func: Callable[Concatenate[AsyncSession, Param], Awaitable[RetType]],
) -> Callable[Param, Awaitable[RetType]]:
    @wraps(func)
    async def wrapper(*args: Param.args, **kwargs: Param.kwargs) -> Awaitable[RetType]:
        engine = create_async_engine(SETTINGS.connection_string, poolclass=NullPool)
        async with AsyncSession(engine) as session:
            async with session.begin():
                return await func(session, *args, **kwargs)

    return wrapper


def async_task(
    func: Callable[Param, Awaitable[RetType]],
) -> Callable[Param, RetType]:
    @wraps(func)
    def wrapper(*args: Param.args, **kwargs: Param.kwargs) -> RetType:
        return anyio.run(func, *args, **kwargs)

    return wrapper
