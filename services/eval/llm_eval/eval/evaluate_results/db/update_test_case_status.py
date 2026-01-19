from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCase, TestCaseStatus


async def update_test_case_status(
    session: AsyncSession,
    test_case_id: str,
    status: TestCaseStatus,
    error: str | None = None,
) -> None:
    statement = (
        update(TestCase)
        .where(TestCase.id == test_case_id)
        .values(status=status, error=error)
    )
    await session.execute(statement)
