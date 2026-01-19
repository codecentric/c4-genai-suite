from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import Evaluation
from llm_eval.eval.evaluations.db.count_evaluations import count_evaluations
from llm_eval.eval.evaluations.db.find_evaluation import (
    find_last_evaluation,
    find_last_evaluations_for_catalog,
)
from llm_eval.eval.evaluations.models import MetricResult
from llm_eval.qa_catalog.db.count_qa_catalogs import count_qa_catalogs
from llm_eval.schemas import ApiModel


class DashboardStatistics(ApiModel):
    number_of_catalogs: int
    number_of_evaluations: int


class DashboardEvaluationResult(ApiModel):
    id: str
    name: str
    created_at: datetime
    metric_results: list[MetricResult]

    @staticmethod
    def from_evaluation(evaluation: Evaluation) -> "DashboardEvaluationResult":
        return DashboardEvaluationResult(
            id=evaluation.id,
            name=evaluation.name,
            created_at=evaluation.created_at,
            metric_results=[
                MetricResult.from_evaluation_and_metric(evaluation, metric)
                for metric in evaluation.metrics
            ],
        )


class DashboardLastEvaluationCatalogHistory(ApiModel):
    catalog_id: str
    catalog_name: str
    evaluation_results: list[DashboardEvaluationResult]


class DashboardLastEvaluationResult(DashboardEvaluationResult):
    catalog_history: DashboardLastEvaluationCatalogHistory | None


class DashboardData(ApiModel):
    last_evaluation: DashboardLastEvaluationResult | None
    statistics: DashboardStatistics


async def get_dashboard_data(db: AsyncSession) -> DashboardData:
    number_of_catalogs = await count_qa_catalogs(db)
    number_of_evaluations = await count_evaluations(db)

    last_evaluation = await find_last_evaluation(db)

    last_evaluation_result = None

    if last_evaluation is not None:
        catalog_history = None
        if last_evaluation.catalog_id is not None:
            catalog_last_evaluations = await find_last_evaluations_for_catalog(
                db, last_evaluation.catalog_id
            )

            catalog_history = DashboardLastEvaluationCatalogHistory(
                catalog_id=last_evaluation.catalog_id,
                catalog_name=last_evaluation.catalog.qa_catalog_group.name,
                evaluation_results=[
                    DashboardEvaluationResult.from_evaluation(evaluation)
                    for evaluation in catalog_last_evaluations
                ],
            )

        last_evaluation_result = DashboardLastEvaluationResult(
            id=last_evaluation.id,
            name=last_evaluation.name,
            created_at=last_evaluation.created_at,
            metric_results=[
                MetricResult.from_evaluation_and_metric(last_evaluation, metric)
                for metric in last_evaluation.metrics
            ],
            catalog_history=catalog_history,
        )

    return DashboardData(
        last_evaluation=last_evaluation_result,
        statistics=DashboardStatistics(
            number_of_catalogs=number_of_catalogs,
            number_of_evaluations=number_of_evaluations,
        ),
    )
