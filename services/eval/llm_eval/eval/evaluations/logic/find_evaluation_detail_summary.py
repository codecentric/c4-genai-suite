from datetime import datetime
from typing import Self

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import EvaluationStatus, QACatalog
from llm_eval.eval.evaluations.db.find_evaluation import (
    find_evaluation_with_test_cases_and_catalog,
)
from llm_eval.eval.evaluations.models import (
    MetricResult,
    MetricScores,
    TestCaseProgress,
)
from llm_eval.qa_catalog.db.count_qa_pairs import count_qa_pairs
from llm_eval.schemas import ApiModel


class EvaluationDetailSummaryMetric(ApiModel):
    id: str
    name: str
    type: str


class EvaluationDetailSummaryQaCatalog(ApiModel):
    id: str
    name: str
    qa_pair_count: int = 0

    def from_catalog(catalog: QACatalog) -> Self:
        return EvaluationDetailSummaryQaCatalog(
            id=catalog.id, name=catalog.qa_catalog_group.name
        )


class EvaluationDetailSummary(ApiModel):
    id: str
    name: str
    created_at: datetime
    qa_catalog: EvaluationDetailSummaryQaCatalog | None
    metrics: list[EvaluationDetailSummaryMetric]
    metric_results: list[MetricResult]
    metric_scores: list[MetricScores]
    status: EvaluationStatus
    test_case_progress: TestCaseProgress
    version: int


async def find_evaluation_detail_summary(
    db: AsyncSession, evaluation_id: str
) -> EvaluationDetailSummary | None:
    evaluation = await find_evaluation_with_test_cases_and_catalog(db, evaluation_id)

    if evaluation is None:
        return None

    if evaluation.catalog:
        qa_catalog = EvaluationDetailSummaryQaCatalog.from_catalog(evaluation.catalog)
        qa_catalog.qa_pair_count = await count_qa_pairs(db, qa_catalog.id)
    else:
        qa_catalog = None

    metrics = [
        EvaluationDetailSummaryMetric(
            id=metric.id,
            name=metric.metric_config["name"],
            type=metric.metric_config["type"],
        )
        for metric in evaluation.metrics
    ]

    metric_results = [
        MetricResult.from_evaluation_and_metric(evaluation, metric)
        for metric in evaluation.metrics
    ]

    metric_scores = [
        MetricScores.from_evaluation_and_metric(evaluation, metric)
        for metric in evaluation.metrics
    ]

    return EvaluationDetailSummary(
        id=evaluation_id,
        name=evaluation.name,
        created_at=evaluation.created_at,
        qa_catalog=qa_catalog,
        metrics=metrics,
        metric_results=metric_results,
        metric_scores=metric_scores,
        status=evaluation.status,
        test_case_progress=TestCaseProgress.from_test_cases(evaluation.test_cases),
        version=evaluation.version,
    )
