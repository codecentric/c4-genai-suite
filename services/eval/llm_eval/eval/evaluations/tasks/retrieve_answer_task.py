from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCaseStatus
from llm_eval.eval.evaluate_results.db.find_test_case import find_test_case
from llm_eval.eval.evaluations.tasks.utils.test_case import fail_test_case
from llm_eval.llm_query.c4_assistant_query import C4AssistantQuery
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
async def retrieve_answer_task(
    session: AsyncSession,
    test_case_id: str,
    c4_assistant_id: int,
    callback_user_id: str,
    callback_user_name: str,
) -> None:
    test_case = await find_test_case(session, test_case_id)

    if test_case is None:
        logger.error(f"Test case '{test_case_id}' not found.")
        return

    if test_case.status != TestCaseStatus.RETRIEVING_ANSWER:
        logger.info(
            f"Test case '{test_case_id}' not in retrieving answer state. Ignoring..."
        )
        return

    query = C4AssistantQuery(
        assistant_id=c4_assistant_id,
        user_id=callback_user_id,
        user_name=callback_user_name,
    )

    result = await query.query(
        test_case.input, test_case.meta_data if test_case.meta_data is not None else {}
    )

    test_case.actual_output = result.answer
    test_case.retrieval_context = result.retrieval_context
    test_case.llm_configuration_id = result.configuration.id
    test_case.llm_configuration_name = result.configuration.name
    test_case.llm_configuration_version = result.configuration.version
    test_case.status = TestCaseStatus.EVALUATING
