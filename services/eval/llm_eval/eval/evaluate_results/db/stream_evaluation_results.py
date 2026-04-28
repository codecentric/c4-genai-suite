from typing import AsyncIterator

from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    EvaluationMetric,
    TestCase,
    TestCaseEvaluationResult,
)


class EvaluationResultItem(BaseModel):
    test_case_id: str
    input: str
    expected_output: str | None
    actual_output: str | None
    metric_name: str | None
    score: float | None
    reason: str | None


async def stream_evaluation_results(
    db: AsyncSession, evaluation_id: str | None
) -> AsyncIterator[EvaluationResultItem]:
    statement = (
        select(
            TestCase.id,
            TestCase.input,
            TestCase.expected_output,
            TestCase.actual_output,
            TestCaseEvaluationResult.score,
            TestCaseEvaluationResult.reason,
            EvaluationMetric.metric_config["name"].label("metric_name"),
        )
        .outerjoin(
            TestCaseEvaluationResult,
            TestCaseEvaluationResult.test_case_id == TestCase.id,
        )
        .outerjoin(
            EvaluationMetric,
            EvaluationMetric.id == TestCaseEvaluationResult.evaluation_metric_id,
        )
        .where(TestCase.evaluation_id == evaluation_id)
        .order_by(
            TestCase.grouping_key,
            TestCase.index,
            TestCaseEvaluationResult.id,
        )
    )

    async for partition in (await db.stream(statement)).partitions(1000):
        for row in partition:
            yield EvaluationResultItem(
                test_case_id=row.id,
                input=row.input,
                expected_output=row.expected_output,
                actual_output=row.actual_output,
                metric_name=row.metric_name,
                reason=row.reason,
                score=row.score,
            )
