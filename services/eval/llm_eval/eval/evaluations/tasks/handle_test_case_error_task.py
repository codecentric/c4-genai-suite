from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCaseStatus
from llm_eval.eval.evaluate_results.db.find_test_case import find_test_case
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
async def handle_test_case_task(
    session: AsyncSession,
    _request: any,
    e: Exception,
    _traceback: any,
    test_case_id: str,
) -> None:
    logger.info(f"Test case {test_case_id} failed: {repr(e)}")

    test_case = await find_test_case(session, test_case_id)

    if test_case is None:
        return

    test_case.status = TestCaseStatus.FAILURE
    test_case.error = repr(e)
