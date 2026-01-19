from datetime import datetime
from typing import Sequence

from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import subqueryload

from llm_eval.database.model import (
    Evaluation,
    TestCase,
    TestCaseEvaluationResult,
)
from llm_eval.utils.json_types import JSONObject


class DbGroupedTestCases(BaseModel):
    llm_configuration_id: str | None
    llm_configuration_name: str | None
    llm_configuration_version: str | None
    query_input: str
    expected_output: str
    grouping_key: str
    meta_data: JSONObject | None
    created_at: datetime


async def find_grouped_test_cases(
    db: AsyncSession, limit: int, offset: int, evaluation_id: str
) -> Sequence[TestCase]:
    grouping_key_select = (
        select(TestCase.grouping_key)
        .where(TestCase.evaluation_id == evaluation_id)
        .group_by(TestCase.grouping_key)
        .order_by(TestCase.grouping_key)
        .limit(limit)
        .offset(offset)
    )

    statement = (
        select(TestCase)
        .where(TestCase.grouping_key.in_(grouping_key_select.subquery()))
        .options(
            subqueryload(TestCase.evaluation_results).joinedload(
                TestCaseEvaluationResult.evaluation_metric
            ),
        )
        .order_by(TestCase.grouping_key, TestCase.index)
    )

    return (await db.scalars(statement)).unique().all()


async def find_grouped_results(
    db: AsyncSession, limit: int, offset: int, evaluation_id: str | None
) -> list[DbGroupedTestCases]:
    statement = (
        select(
            TestCase.llm_configuration_id,
            TestCase.llm_configuration_name,
            TestCase.llm_configuration_version,
            TestCase.input,
            TestCase.expected_output,
            TestCase.grouping_key,
            TestCase.meta_data,
            Evaluation.created_at,
        )
        .join(Evaluation)
        .group_by(
            TestCase.llm_configuration_id,
            TestCase.llm_configuration_name,
            TestCase.llm_configuration_version,
            TestCase.input,
            TestCase.expected_output,
            TestCase.grouping_key,
            TestCase.meta_data,
            Evaluation.created_at,
        )
        .order_by(desc(Evaluation.created_at))
        .limit(limit)
        .offset(offset)
    )

    if evaluation_id:
        statement = statement.where(Evaluation.id == evaluation_id)

    return [
        DbGroupedTestCases(
            llm_configuration_id=llm_configuration_id,
            llm_configuration_name=llm_configuration_name,
            llm_configuration_version=llm_configuration_version,
            query_input=query_input,
            expected_output=expected_output,
            grouping_key=grouping_key,
            meta_data=meta_data,
            created_at=created_at,
        )
        for (
            llm_configuration_id,
            llm_configuration_name,
            llm_configuration_version,
            query_input,
            expected_output,
            grouping_key,
            meta_data,
            created_at,
        ) in await db.execute(statement)
    ]
