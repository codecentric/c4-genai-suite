from celery import chain
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import EvaluationMetric, EvaluationStatus, TestCase
from llm_eval.eval.evaluations.db.find_evaluation import find_evaluation
from llm_eval.eval.evaluations.tasks.complete_evaluation_task import (
    complete_evaluation_task,
)
from llm_eval.eval.evaluations.tasks.evaluate_test_case_task import (
    evaluate_test_case_task,
)
from llm_eval.eval.evaluations.tasks.handle_evaluation_error_task import (
    handle_evaluation_error_task,
)
from llm_eval.eval.evaluations.tasks.handle_test_case_error_task import (
    handle_test_case_task,
)
from llm_eval.eval.evaluations.tasks.retrieve_answer_task import (
    retrieve_answer_task,
)
from llm_eval.tasks import app
from llm_eval.utils.task import async_task, with_session


def submit_start_evaluation_task(evaluation_id: str) -> None:
    # noinspection PyUnresolvedReferences
    start_evaluation_task.si(evaluation_id).on_error(
        handle_evaluation_error_task.s(evaluation_id)
    ).delay()


@app.task(
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_backoff_max=600,
    max_retries=10,
)
@async_task
@with_session
async def start_evaluation_task(session: AsyncSession, evaluation_id: str) -> None:
    evaluation = await find_evaluation(session, evaluation_id)

    if evaluation is None:
        logger.warning(f"Evaluation with ID {evaluation_id} not found.")
        raise ValueError(f"Evaluation with ID {evaluation_id} not found.")

    if evaluation.status != EvaluationStatus.PENDING:
        logger.info(f"Evaluation {evaluation_id} is not in pending status. Ignoring...")
        return

    logger.info(f"Processing evaluation {evaluation.id}:{evaluation.version}...")

    evaluation.status = EvaluationStatus.RUNNING
    await session.flush()

    test_cases: list[TestCase] = await evaluation.awaitable_attrs.test_cases
    metrics: list[EvaluationMetric] = await evaluation.awaitable_attrs.metrics

    for test_case in test_cases:
        # noinspection PyUnresolvedReferences
        c = chain(
            retrieve_answer_task.si(test_case.id, evaluation.llm_endpoint_id).on_error(
                handle_test_case_task.s(test_case.id)
            ),
            evaluate_test_case_task.si(
                test_case.id, [metric.id for metric in metrics]
            ).on_error(handle_test_case_task.s(test_case.id)),
            complete_evaluation_task.si(evaluation_id),
        ).on_error(handle_evaluation_error_task.s(evaluation_id, False))

        c.delay()

        logger.info(f"Started process for test case {test_case.id}.")
