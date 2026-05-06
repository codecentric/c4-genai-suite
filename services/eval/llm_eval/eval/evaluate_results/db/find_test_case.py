from typing import cast

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import joinedload

from llm_eval.database.model import TestCase, TestCaseEvaluationResult


async def find_test_case(db: AsyncSession, result_id: str) -> TestCase | None:
    statement = (
        select(TestCase)
        .options(
            joinedload(TestCase.evaluation_results).joinedload(
                TestCaseEvaluationResult.evaluation_metric
            )
        )
        .where(cast(ColumnElement[bool], TestCase.id == result_id))
    )

    return (await db.scalars(statement)).unique().one_or_none()
