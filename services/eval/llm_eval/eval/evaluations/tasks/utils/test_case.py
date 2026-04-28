from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCase, TestCaseStatus


async def fail_test_case(
    session: AsyncSession, test_case: TestCase, message: str
) -> None:
    logger.info(message)

    test_case.status = TestCaseStatus.FAILURE
    test_case.error = message

    await session.flush()
