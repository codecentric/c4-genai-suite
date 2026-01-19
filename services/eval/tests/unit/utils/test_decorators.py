import os
from typing import Generator
from unittest.mock import MagicMock

import pytest

from llm_eval.utils.decorators import RetryError, async_retry_on_error


class CustomException(Exception):
    pass


# Clear the env var after each test case to avoid side effects
@pytest.fixture(autouse=True)
def before_and_after_test() -> Generator[None, None, None]:
    if "TEST_DECORATORS_EXCEPTION_WAS_RAISED" in os.environ:
        del os.environ["TEST_DECORATORS_EXCEPTION_WAS_RAISED"]
    yield
    if "TEST_DECORATORS_EXCEPTION_WAS_RAISED" in os.environ:
        del os.environ["TEST_DECORATORS_EXCEPTION_WAS_RAISED"]


async def async_function_that_raises_exception_once() -> None:
    if os.getenv("TEST_DECORATORS_EXCEPTION_WAS_RAISED", "False") == "False":
        os.environ["TEST_DECORATORS_EXCEPTION_WAS_RAISED"] = "True"
        raise CustomException("Custom exception raised")
    pass


async def async_function_that_raises_exception() -> None:
    raise CustomException("Custom exception raised")


async def async_function_that_succeeds() -> None:
    pass


# Mock the async functions
async_function_that_raises_exception = MagicMock(
    side_effect=async_function_that_raises_exception
)
async_function_that_raises_exception_once = MagicMock(
    side_effect=async_function_that_raises_exception_once
)
async_function_that_succeeds = MagicMock(side_effect=async_function_that_succeeds)


@pytest.mark.asyncio
async def test_async_retry_on_error_retry_on_custom_exception() -> None:
    # Define test data
    max_retries = 3

    # Decorate the function
    @async_retry_on_error((CustomException,), max_retries)
    async def decorated_function() -> None:
        await async_function_that_raises_exception()

    # Call the decorated function
    with pytest.raises(RetryError):
        await decorated_function()

    # Verify the number of retries
    assert async_function_that_raises_exception.call_count == max_retries


@pytest.mark.asyncio
async def test_async_retry_on_error_no_retry_on_success() -> None:
    # Define test data
    max_retries = 1

    # Decorate the function
    @async_retry_on_error((CustomException,), max_retries)
    async def decorated_function() -> None:
        await async_function_that_succeeds()

    # Call the decorated function
    await decorated_function()

    # Verify no retries occurred
    assert async_function_that_succeeds.call_count == max_retries


@pytest.mark.asyncio
async def test_async_retry_on_error_retry_once_and_succeed() -> None:
    # Define test data
    max_retries = 3

    # Decorate the function
    @async_retry_on_error((CustomException, ValueError), max_retries)
    async def decorated_function() -> None:
        await async_function_that_raises_exception_once()

    # Call the decorated function
    await decorated_function()

    # Verify the number of retries
    assert async_function_that_raises_exception_once.call_count == 2
