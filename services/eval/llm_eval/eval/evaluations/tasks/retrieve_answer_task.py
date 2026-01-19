from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import TestCaseStatus
from llm_eval.eval.evaluate_results.db.find_test_case import find_test_case
from llm_eval.eval.evaluations.tasks.utils.test_case import fail_test_case
from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.llm_endpoints.plugins.factory import get_endpoint_plugin
from llm_eval.llm_endpoints.plugins.interface import LLMQuerySupport
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
    session: AsyncSession, test_case_id: str, endpoint_id: str | None
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

    if endpoint_id is None:
        return await fail_test_case(session, test_case, "No endpoint specified.")

    llm_endpoint = await find_llm_endpoint(session, endpoint_id)

    if llm_endpoint is None:
        return await fail_test_case(
            session, test_case, f"Endpoint '{endpoint_id}' not found."
        )

    endpoint_plugin = get_endpoint_plugin(llm_endpoint)
    endpoint_configuration = endpoint_plugin.configuration_from_db_json(
        llm_endpoint.endpoint_config
    )

    if not isinstance(endpoint_plugin, LLMQuerySupport):
        return await fail_test_case(
            session, test_case, "Used endpoint does not support LLM queries."
        )

    query = endpoint_plugin.create_llm_query(endpoint_configuration)

    result = await query.query(
        test_case.input, test_case.meta_data if test_case.meta_data is not None else {}
    )

    test_case.actual_output = result.answer
    test_case.retrieval_context = result.retrieval_context
    test_case.llm_configuration_id = result.configuration.id
    test_case.llm_configuration_name = result.configuration.name
    test_case.llm_configuration_version = result.configuration.version
    test_case.status = TestCaseStatus.EVALUATING
