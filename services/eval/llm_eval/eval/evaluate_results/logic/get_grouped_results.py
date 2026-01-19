from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    EvaluationMetric,
    TestCase,
    TestCaseEvaluationResult,
    TestCaseStatus,
)
from llm_eval.eval.evaluate_results.db.find_grouped_results import (
    find_grouped_test_cases,
)
from llm_eval.eval.evaluations.db.find_evaluation import find_evaluation
from llm_eval.eval.evaluations.models import MetricResult
from llm_eval.responses import not_found
from llm_eval.schemas import ApiModel
from llm_eval.utils.api import PaginationParams
from llm_eval.utils.json_types import JSONObject


class GroupedEvaluationTestCaseResult(ApiModel):
    success: bool
    metric_id: str
    score: float | None
    threashold: float | None

    @staticmethod
    def from_test_case_result(
        evaluation_result: TestCaseEvaluationResult,
    ) -> "GroupedEvaluationTestCaseResult":
        return GroupedEvaluationTestCaseResult(
            success=evaluation_result.success,
            metric_id=evaluation_result.evaluation_metric_id,
            score=evaluation_result.score,
            threashold=evaluation_result.threshold,
        )


class GroupedEvaluationTestCase(ApiModel):
    id: str
    index: int
    test_case_status: TestCaseStatus
    results: list[GroupedEvaluationTestCaseResult]

    @staticmethod
    def from_test_case(
        test_case: TestCase,
    ) -> "GroupedEvaluationTestCase":
        return GroupedEvaluationTestCase(
            id=test_case.id,
            index=test_case.index,
            test_case_status=test_case.status,
            results=[
                GroupedEvaluationTestCaseResult.from_test_case_result(evaluation_result)
                for evaluation_result in test_case.evaluation_results
            ],
        )


class GroupedEvaluationResult(ApiModel):
    configuration_id: str | None
    configuration_name: str | None
    configuration_version: str | None
    input: str
    expected_output: str
    created_at: datetime
    grouping_key: str | None
    meta_data: JSONObject | None
    metric_results: list[MetricResult]
    test_cases: list[GroupedEvaluationTestCase]

    @staticmethod
    def _from_test_case(test_case: TestCase) -> "GroupedEvaluationResult":
        return GroupedEvaluationResult(
            configuration_id=test_case.llm_configuration_id,
            configuration_name=test_case.llm_configuration_name,
            configuration_version=test_case.llm_configuration_version,
            input=test_case.input,
            expected_output=test_case.expected_output,
            grouping_key=test_case.grouping_key,
            meta_data=test_case.meta_data,
            created_at=datetime.now(),
            metric_results=[],
            test_cases=[GroupedEvaluationTestCase.from_test_case(test_case)],
        )

    def _add_test_case(self, test_case: TestCase) -> None:
        self.configuration_id = (
            test_case.llm_configuration_id
            if self.configuration_id is None
            else self.configuration_id
        )
        self.configuration_name = (
            test_case.llm_configuration_name
            if self.configuration_name is None
            else self.configuration_name
        )
        self.configuration_version = (
            test_case.llm_configuration_version
            if self.configuration_version is None
            else self.configuration_version
        )
        self.test_cases.append(GroupedEvaluationTestCase.from_test_case(test_case))


async def get_grouped_results(
    db: AsyncSession, pagination_params: PaginationParams, evaluation_id: str
) -> list[GroupedEvaluationResult]:
    evaluation = await find_evaluation(db, evaluation_id)

    if evaluation is None:
        raise not_found(f"Evaluation with id {evaluation_id} not found")

    test_cases = await find_grouped_test_cases(
        db, pagination_params.limit, pagination_params.offset, evaluation_id
    )

    results: list[GroupedEvaluationResult] = []

    for test_case in test_cases:
        current_result = results[-1] if len(results) > 0 else None

        if (
            current_result is None
            or current_result.grouping_key != test_case.grouping_key
        ):
            current_result = GroupedEvaluationResult._from_test_case(test_case)
            results.append(current_result)
        else:
            current_result._add_test_case(test_case)

    await evaluation.awaitable_attrs.metrics

    for result in results:
        for metric in evaluation.metrics:
            result.metric_results.append(
                collect_metric_result(result.test_cases, metric)
            )

    return results


def collect_metric_result(
    test_cases: list[GroupedEvaluationTestCase], metric: EvaluationMetric
) -> MetricResult:
    metric_result = MetricResult(
        id=metric.id,
        name=metric.metric_config["name"],
        type=metric.metric_config["type"],
        total=len(test_cases),
        successes=0,
        failures=0,
        errors=0,
    )

    for test_case in test_cases:
        if test_case.test_case_status == TestCaseStatus.FAILURE:
            metric_result.errors += 1
        else:
            result = next(
                (
                    result
                    for result in test_case.results
                    if result.metric_id == metric.id
                ),
                None,
            )

            if result is not None:
                if result.success:
                    metric_result.successes += 1
                else:
                    metric_result.failures += 1

    return metric_result
