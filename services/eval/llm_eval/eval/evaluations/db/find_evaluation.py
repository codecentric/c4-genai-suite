from datetime import datetime
from typing import Sequence

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased, joinedload, subqueryload

from llm_eval.database.model import Evaluation, QACatalog, TestCase
from llm_eval.utils.api import PaginationParams


async def find_evaluation(db: AsyncSession, evaluation_id: str) -> Evaluation | None:
    statement = (
        select(Evaluation)
        .where(Evaluation.id == evaluation_id)
        .options(joinedload(Evaluation.catalog))
    )

    return (await db.scalars(statement)).unique().one_or_none()


async def find_evaluation_with_test_cases_and_catalog(
    db: AsyncSession, evaluation_id: str
) -> Evaluation | None:
    statement = (
        select(Evaluation)
        .where(Evaluation.id == evaluation_id)
        .options(
            joinedload(Evaluation.catalog),
            joinedload(Evaluation.test_cases).subqueryload(TestCase.evaluation_results),
            subqueryload(Evaluation.metrics),
        )
    )

    return (await db.scalars(statement)).unique().one_or_none()


async def find_last_evaluation(db: AsyncSession) -> Evaluation | None:
    evaluations_statement = (
        select(Evaluation).order_by(desc(Evaluation.created_at)).limit(1)
    )

    evaluation_select = aliased(
        Evaluation,
        evaluations_statement.subquery(),
    )

    statement = select(evaluation_select).options(
        joinedload(evaluation_select.catalog).joinedload(QACatalog.qa_catalog_group),
        joinedload(evaluation_select.test_cases).subqueryload(
            TestCase.evaluation_results
        ),
        subqueryload(evaluation_select.metrics),
    )

    return (await db.scalars(statement)).unique().one_or_none()


async def find_last_evaluations_for_catalog(
    db: AsyncSession, catalog_id: str, limit: int = 10
) -> Sequence[Evaluation]:
    evaluations_statement = (
        select(Evaluation)
        .where(Evaluation.catalog_id == catalog_id)
        .order_by(desc(Evaluation.created_at))
        .limit(limit)
    )

    evaluation_select = aliased(
        Evaluation,
        evaluations_statement.subquery(),
    )

    statement = (
        select(evaluation_select)
        .options(
            joinedload(evaluation_select.test_cases).subqueryload(
                TestCase.evaluation_results
            ),
            subqueryload(evaluation_select.metrics),
        )
        .order_by(evaluation_select.created_at)
    )

    return (await db.scalars(statement)).unique().all()


async def find_evaluations_with_metric_results(
    db: AsyncSession,
    pagination_params: PaginationParams,
    query: str | None = None,
    from_date: datetime | None = None,
    to_date: datetime | None = None,
) -> Sequence[Evaluation]:
    evaluations_statement = select(Evaluation)

    if query:
        evaluations_statement = evaluations_statement.where(
            Evaluation.name.ilike(f"%{query}%") | (Evaluation.id == query)
        )

    if from_date:
        evaluations_statement = evaluations_statement.where(
            Evaluation.created_at >= from_date
        )
    if to_date:
        evaluations_statement = evaluations_statement.where(
            Evaluation.created_at <= to_date
        )

    evaluations_statement = (
        evaluations_statement.order_by(desc(Evaluation.created_at))
        .limit(pagination_params.limit)
        .offset(pagination_params.offset)
    )
    evaluations_select = aliased(
        Evaluation,
        evaluations_statement.subquery(),
    )

    statement = (
        select(evaluations_select)
        .options(
            joinedload(evaluations_select.catalog),
            joinedload(evaluations_select.test_cases).subqueryload(
                TestCase.evaluation_results
            ),
            subqueryload(evaluations_select.metrics),
        )
        .order_by(desc(evaluations_select.created_at))
    )

    return (await db.scalars(statement)).unique().all()
