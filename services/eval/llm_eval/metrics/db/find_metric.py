from typing import Sequence, cast

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import EvaluationMetric
from llm_eval.utils.api import PaginationParams


async def find_metrics(
    db: AsyncSession, pagination_params: PaginationParams
) -> Sequence[EvaluationMetric]:
    statement = (
        select(EvaluationMetric)
        .order_by(EvaluationMetric.metric_config["name"], EvaluationMetric.id)
        .limit(pagination_params.limit)
        .offset(pagination_params.offset)
    )

    return (await db.scalars(statement)).unique().all()


async def find_metric(db: AsyncSession, metric_id: str) -> EvaluationMetric | None:
    return (
        await db.scalars(
            select(EvaluationMetric).where(
                cast(ColumnElement[bool], EvaluationMetric.id == metric_id)
            )
        )
    ).one_or_none()


async def find_metrics_by_ids(
    db: AsyncSession, metric_ids: list[str]
) -> Sequence[EvaluationMetric]:
    return (
        await db.scalars(
            select(EvaluationMetric).where(EvaluationMetric.id.in_(metric_ids))
        )
    ).all()
