from typing import cast

from sqlalchemy import ColumnElement, Result, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCase, TestCaseEvaluationResult


async def find_metric_success_by_grouping_key(
    db: AsyncSession, grouping_key: str
) -> Result[tuple[str, int, str, bool]]:
    statement = (
        select(
            TestCase.id,
            TestCase.index,
            TestCase.status,
            TestCaseEvaluationResult.success,
        )
        .join(TestCaseEvaluationResult, isouter=True)
        .where(
            cast(
                ColumnElement[bool],
                TestCase.grouping_key == grouping_key,
            )
        )
        .order_by(TestCase.index)
    )

    return await db.execute(statement)
