from typing import Callable


from loguru import logger


class RetryError(Exception):
    pass


def async_retry_on_error(
    exceptions: tuple[type[Exception], ...],
    max_retries: int,
    exception_filter: Callable[[type[Exception]], bool] = lambda e: True,
) -> callable:
    """Decorator to retry a function if it raises an exception defined in exceptions."""
    from anyio import sleep

    def decorator(function: callable) -> callable:
        async def wrapper(*args: any, **kwargs: any) -> None:
            for i in range(max_retries):
                try:
                    return await function(*args, **kwargs)
                except exceptions as e:
                    if exception_filter(e):
                        wait = 2**i
                        logger.warning(
                            f"Error occurred ({i + 1}/{max_retries}): {repr(e)}."
                            f" Retrying in {wait}s..."
                        )
                        await sleep(wait)
                    else:
                        raise e

            raise RetryError(
                "Max retries exceeded while calling async function " + function.__name__
            )

        return wrapper

    return decorator


def retry_on_error(
    exceptions: tuple[type[Exception], ...],
    max_retries: int,
    exception_filter: Callable[[type[Exception]], bool] = lambda e: True,
) -> callable:
    """Decorator to retry a function if it raises an exception defined in exceptions."""
    from time import sleep

    def decorator(function: callable) -> callable:
        def wrapper(*args: any, **kwargs: any) -> None:
            for i in range(max_retries):
                try:
                    return function(*args, **kwargs)
                except exceptions as e:
                    if exception_filter(e):
                        wait = 2**i
                        logger.warning(
                            f"Error occurred ({i + 1}/{max_retries}): {e}."
                            f" Retrying in {wait}s..."
                        )
                        sleep(wait)
                    else:
                        raise e

            raise RetryError("Max retries exceeded.")

        return wrapper

    return decorator
