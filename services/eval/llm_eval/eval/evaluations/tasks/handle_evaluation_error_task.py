from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import EvaluationStatus, TestCaseStatus
from llm_eval.eval.evaluations.db.find_evaluation import find_evaluation
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
async def handle_evaluation_error_task(
    session: AsyncSession,
    _request: any,
    e: Exception,
    _traceback: any,
    evaluation_id: str,
    fail_test_cases: bool = True,
) -> None:
    logger.info(f"Evaluation {evaluation_id} failed: {repr(e)}")

    evaluation = await find_evaluation(session, evaluation_id)

    if evaluation is None:
        return

    await evaluation.awaitable_attrs.test_cases

    if fail_test_cases:
        for test_case in evaluation.test_cases:
            if not test_case.is_finished():
                test_case.status = TestCaseStatus.FAILURE
                test_case.error = "evaluation failed"

    if all(test_case.is_finished() for test_case in evaluation.test_cases):
        if all(
            test_case.status == TestCaseStatus.FAILURE
            for test_case in evaluation.test_cases
        ):
            evaluation.status = EvaluationStatus.FAILURE
            evaluation.error = repr(e)
        else:
            evaluation.status = EvaluationStatus.SUCCESS
