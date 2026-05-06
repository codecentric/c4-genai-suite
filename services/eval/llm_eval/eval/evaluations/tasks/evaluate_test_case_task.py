from datetime import datetime
from uuid import uuid4

from deepeval.evaluate import TestResult as EvalTestResult
from deepeval.evaluate import evaluate
from deepeval.test_case import LLMTestCase
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    TestCase,
    TestCaseEvaluationResult,
    TestCaseStatus,
)
from llm_eval.eval.evaluate_results.db.find_test_case import find_test_case
from llm_eval.metrics.db.find_metric import find_metrics_by_ids
from llm_eval.metrics.plugins.factory import get_metric_plugin
from llm_eval.metrics.plugins.impl.metric_wrapper import MetricWrapper
from llm_eval.settings import SETTINGS
from llm_eval.tasks import app
from llm_eval.utils.task import async_task, with_session


@app.task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=10,
)
@async_task
@with_session
async def evaluate_test_case_task(
    session: AsyncSession, test_case_id: str, metric_ids: list[str]
) -> None:
    logger.info(f"Evaluating test case '{test_case_id}' with metrics {str(metric_ids)}")

    test_case = await find_test_case(session, test_case_id)

    if test_case is None:
        logger.error(f"Test case '{test_case_id}' not found.")
        return

    if test_case.status != TestCaseStatus.EVALUATING:
        logger.info(f"Test case '{test_case_id}' not in evaluating state. Ignoring...")
        return

    metrics = await _build_metrics(session, metric_ids)

    if len(metric_ids) > 0:
        llm_test_case = LLMTestCase(
            input=test_case.input,
            actual_output=test_case.actual_output,
            expected_output=test_case.expected_output,
            context=test_case.context or [],
            retrieval_context=test_case.retrieval_context or [],
            additional_metadata=test_case.meta_data,
        )
        evaluate_result = evaluate(
            test_cases=[llm_test_case],
            metrics=metrics,
            print_results=False,
            run_async=False,
            show_indicator=SETTINGS.evaluation.show_indicator,
            write_cache=False,
            use_cache=False,
            max_concurrent=1,
        )

        evaluation_results = _build_evaluation_results(
            test_case, metrics, evaluate_result.test_results[0]
        )

        test_case.evaluation_results = evaluation_results

    test_case.status = TestCaseStatus.SUCCESS


async def _build_metrics(
    session: AsyncSession, metric_ids: list[str]
) -> list[MetricWrapper]:
    evaluation_metrics = await find_metrics_by_ids(session, metric_ids)

    metrics: list[MetricWrapper] = []

    for metric in evaluation_metrics:
        metric_plugin = get_metric_plugin(metric)

        configuration = metric_plugin.configuration_from_db_json(metric.metric_config)
        metrics.append(
            MetricWrapper(
                evaluation_metric_id=metric.id,
                name=configuration.name,
                metric=await metric_plugin.create_deepeval_metric(
                    session, configuration
                ),
            )
        )

    return metrics


def _build_evaluation_results(
    test_case: TestCase, metrics: list[MetricWrapper], eval_test_result: EvalTestResult
) -> list[TestCaseEvaluationResult]:
    now = datetime.now()
    test_case_evaluation_results: list[TestCaseEvaluationResult] = []

    for metric_result in eval_test_result.metrics_data:
        metric_wrapper = next((x for x in metrics if x.matches(metric_result)), None)
        test_case_evaluation_results.append(
            TestCaseEvaluationResult(
                id=str(uuid4()),
                created_at=now,
                name=metric_wrapper.__name__,
                threshold=metric_result.threshold,
                success=metric_result.success,
                score=metric_result.score,
                reason=metric_result.reason,
                strict_mode=metric_result.strict_mode,
                evaluation_model=metric_result.evaluation_model,
                evaluation_cost=metric_result.evaluation_cost,
                verbose_logs=metric_result.verbose_logs,
                test_case_id=test_case.id,
                evaluation_metric_id=metric_wrapper.evaluation_metric_id,
            )
        )

    return test_case_evaluation_results
