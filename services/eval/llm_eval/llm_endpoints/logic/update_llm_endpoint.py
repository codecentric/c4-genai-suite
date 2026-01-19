from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    LLMEndpoint,
)
from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.llm_endpoints.plugins.api_models import (
    LLMEndpointConfigurationUpdate,
)
from llm_eval.llm_endpoints.plugins.factory import get_endpoint_plugin
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class LLMEndpointUpdate(ApiModel):
    name: str | None = None
    configuration: LLMEndpointConfigurationUpdate
    version: int


async def update_llm_endpoint(
    db: AsyncSession,
    llm_endpoint_id: str,
    llm_endpoint_update: LLMEndpointUpdate,
    user_id: str,
) -> LLMEndpoint | None:
    llm_endpoint = await find_llm_endpoint(db, llm_endpoint_id)
    if llm_endpoint is None:
        return None

    if llm_endpoint.version != llm_endpoint_update.version:
        raise entity_outdated()

    endpoint_plugin = get_endpoint_plugin(llm_endpoint_update.configuration.type)

    now = datetime.now()

    llm_endpoint.updated_at = now
    llm_endpoint.updated_by = user_id
    llm_endpoint.type = llm_endpoint_update.configuration.type

    if llm_endpoint_update.name is not None:
        llm_endpoint.name = llm_endpoint_update.name

    configuration = endpoint_plugin.configuration_from_db_json(
        llm_endpoint.endpoint_config
    )
    configuration = endpoint_plugin.update_configuration(
        configuration, llm_endpoint_update.configuration
    )

    llm_endpoint.endpoint_config = configuration.to_db_json()

    await db.flush()

    return llm_endpoint
