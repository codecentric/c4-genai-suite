from langchain_core.language_models import BaseChatModel
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.llm_endpoints.plugins.factory import get_endpoint_plugin
from llm_eval.llm_endpoints.plugins.interface import ChatModelSupport


async def get_chat_model(session: AsyncSession, chat_model_id: str) -> BaseChatModel:
    llm_endpoint = await find_llm_endpoint(session, chat_model_id)

    endpoint_plugin = get_endpoint_plugin(llm_endpoint)

    # noinspection PyTypeChecker
    endpoint_configuration = endpoint_plugin.configuration_from_db_json(
        llm_endpoint.endpoint_config
    )

    if not isinstance(endpoint_plugin, ChatModelSupport):
        raise Exception("Used endpoint does not support chat models.")

    return endpoint_plugin.create_chat_model(endpoint_configuration)
