from fastapi import APIRouter
from pydantic import model_validator

from llm_eval.database.model import (
    TestCase,
    TestCaseEvaluationResult,
    TestCaseStatus,
)
from llm_eval.db import SessionDep
from llm_eval.eval.evaluate_results.db.find_test_case import (
    find_test_case,
)
from llm_eval.eval.evaluate_results.logic.get_grouped_results import (
    GroupedEvaluationResult,
    get_grouped_results,
)
from llm_eval.responses import not_found, not_found_response
from llm_eval.schemas import ApiModel
from llm_eval.utils.api import PaginationParamsDep
from llm_eval.utils.json_types import JSONObject


# noinspection PyNestedDecorators
class MetricsData(ApiModel):
    id: str
    name: str
    threshold: float
    success: bool
    score: float | None
    reason: str | None
    strict_mode: bool | None
    evaluation_model: str | None
    error: str | None

    @model_validator(mode="before")
    @classmethod
    def transform(cls, metric: any) -> any:
        if not isinstance(metric, TestCaseEvaluationResult):
            return metric

        return {
            "id": metric.id,
            "name": metric.evaluation_metric.metric_config["name"],
            "threshold": metric.threshold,
            "success": metric.success,
            "score": metric.score,
            "reason": metric.reason,
            "strict_mode": metric.strict_mode,
            "evaluation_model": metric.evaluation_model,
            "error": metric.error,
        }


# noinspection PyNestedDecorators
class EvaluationResult(ApiModel):
    id: str
    configuration_id: str | None
    configuration_name: str | None
    configuration_version: str | None
    input: str
    expected_output: str
    context: list[str] | None
    actual_output: str | None
    retrieval_context: list[str] | None
    meta_data: JSONObject | None
    metrics_data: list[MetricsData]
    status: TestCaseStatus
    error: str | None

    @model_validator(mode="before")
    @classmethod
    def transform(cls, obj: any) -> any:
        if not isinstance(obj, TestCase):
            return obj

        return {
            "id": obj.id,
            "configuration_id": obj.llm_configuration_id,
            "configuration_name": obj.llm_configuration_name,
            "configuration_version": obj.llm_configuration_version,
            "input": obj.input,
            "expected_output": obj.expected_output,
            "context": obj.context,
            "actual_output": obj.actual_output,
            "retrieval_context": obj.retrieval_context,
            "meta_data": obj.meta_data,
            "metrics_data": [
                MetricsData.model_validate(metric) for metric in obj.evaluation_results
            ],
            "status": obj.status,
            "error": obj.error,
        }


router = APIRouter(prefix="/evaluation-results", tags=["evaluation-results"])


@router.get("/grouped")
async def get_grouped(
    db: SessionDep,
    pagination_params: PaginationParamsDep,
    evaluation_id: str = None,
) -> list[GroupedEvaluationResult]:
    return await get_grouped_results(db, pagination_params, evaluation_id)


@router.get("/{result_id}", responses={**not_found_response})
async def get(db: SessionDep, result_id: str) -> EvaluationResult:
    test_case = await find_test_case(db, result_id)

    if test_case is None:
        raise not_found("Result not found")

    return EvaluationResult.model_validate(test_case)
