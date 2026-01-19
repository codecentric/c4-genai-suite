from datetime import datetime

from llm_eval.database.model import (
    Evaluation,
    EvaluationMetric,
    EvaluationStatus,
    QACatalog,
    TestCase,
    TestCaseStatus,
)
from llm_eval.schemas import ApiModel


class TestCaseProgress(ApiModel):
    done: int
    total: int

    @staticmethod
    def from_test_cases(test_cases: list[TestCase]) -> "TestCaseProgress":
        total = len(test_cases)
        done = len([tc for tc in test_cases if tc.is_finished()])
        return TestCaseProgress(done=done, total=total)


class QaCatalogEvaluationResult(ApiModel):
    id: str
    name: str

    @staticmethod
    def from_model(catalog: QACatalog) -> "QaCatalogEvaluationResult":
        return QaCatalogEvaluationResult(
            id=catalog.id, name=catalog.qa_catalog_group.name
        )


class MetricResult(ApiModel):
    id: str
    name: str
    type: str
    total: int
    successes: int
    failures: int
    errors: int

    @staticmethod
    def from_evaluation_and_metric(
        evaluation: Evaluation, metric: EvaluationMetric
    ) -> "MetricResult":
        return MetricResult(
            id=metric.id,
            name=metric.metric_config["name"],
            type=metric.metric_config["type"],
            total=len(evaluation.test_cases),
            successes=len(
                [
                    tc
                    for tc in evaluation.test_cases
                    if MetricResult._is_metric_success_for_test_case(tc, metric.id)
                ]
            ),
            failures=len(
                [
                    tc
                    for tc in evaluation.test_cases
                    if MetricResult._is_metric_failed_for_test_case(tc, metric.id)
                ]
            ),
            errors=len(
                [
                    tc
                    for tc in evaluation.test_cases
                    if tc.status == TestCaseStatus.FAILURE
                ]
            ),
        )

    @staticmethod
    def _is_metric_success_for_test_case(test_case: TestCase, metric_id: str) -> bool:
        return (
            len(
                [
                    result
                    for result in test_case.evaluation_results
                    if result.evaluation_metric_id == metric_id and result.success
                ]
            )
            > 0
        )

    @staticmethod
    def _is_metric_failed_for_test_case(test_case: TestCase, metric_id: str) -> bool:
        return (
            len(
                [
                    result
                    for result in test_case.evaluation_results
                    if result.evaluation_metric_id == metric_id and not (result.success)
                ]
            )
            > 0
        )


class MetricScore(ApiModel):
    test_case_id: str
    score: float


class MetricScores(ApiModel):
    id: str
    name: str
    type: str
    scores: list[MetricScore]

    @staticmethod
    def from_evaluation_and_metric(
        evaluation: Evaluation, metric: EvaluationMetric
    ) -> "MetricScores":
        scores: list[MetricScore] = []

        for test_case in evaluation.test_cases:
            if test_case.status != TestCaseStatus.SUCCESS:
                continue

            score = next(
                (
                    result.score
                    for result in test_case.evaluation_results
                    if result.evaluation_metric_id == metric.id
                ),
                None,
            )

            if score is not None:
                scores.append(MetricScore(test_case_id=test_case.id, score=score))

        return MetricScores(
            id=metric.id,
            name=metric.metric_config["name"],
            type=metric.metric_config["type"],
            scores=scores,
        )


class GetAllEvaluationResult(ApiModel):
    id: str
    name: str
    created_at: datetime
    catalog: QaCatalogEvaluationResult | None
    metric_results: list[MetricResult]
    status: EvaluationStatus
    test_case_progress: TestCaseProgress
    version: int

    @staticmethod
    def from_evaluation(evaluation: Evaluation) -> "GetAllEvaluationResult":
        metric_results = (
            [
                MetricResult.from_evaluation_and_metric(evaluation, metric)
                for metric in evaluation.metrics
            ]
            if evaluation.status == EvaluationStatus.SUCCESS
            else []
        )

        return GetAllEvaluationResult(
            id=evaluation.id,
            name=evaluation.name,
            created_at=evaluation.created_at,
            catalog=QaCatalogEvaluationResult.from_model(evaluation.catalog)
            if evaluation.catalog
            else None,
            status=evaluation.status,
            test_case_progress=TestCaseProgress.from_test_cases(evaluation.test_cases),
            version=evaluation.version,
            metric_results=metric_results,
        )


class EvaluationResult(ApiModel):
    id: str
    name: str
    created_at: datetime
    status: EvaluationStatus
    version: int
