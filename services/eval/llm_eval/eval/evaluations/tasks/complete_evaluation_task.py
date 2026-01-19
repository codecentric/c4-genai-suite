from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    EvaluationStatus,
)
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
async def complete_evaluation_task(session: AsyncSession, evaluation_id: str) -> None:
    evaluation = await find_evaluation(session, evaluation_id)

    if evaluation is None:
        logger.error(f"Evaluation with ID {evaluation_id} not found.")
        return

    if evaluation.status != EvaluationStatus.RUNNING:
        logger.info(f"Evaluation {evaluation_id} is not in running status. Ignoring...")
        return

    await evaluation.awaitable_attrs.test_cases

    if any(not test_case.is_finished() for test_case in evaluation.test_cases):
        logger.info(
            f"Evaluation {evaluation_id} has unfinished test cases. Ignoring..."
        )
        return

    evaluation.status = EvaluationStatus.SUCCESS
