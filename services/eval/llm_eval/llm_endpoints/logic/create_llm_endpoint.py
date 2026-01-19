from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    LLMEndpoint,
)
from llm_eval.llm_endpoints.plugins.api_models import (
    LLMEndpointConfigurationCreate,
)
from llm_eval.llm_endpoints.plugins.factory import get_endpoint_plugin
from llm_eval.schemas import ApiModel


class LLMEndpointCreate(ApiModel):
    name: str
    configuration: LLMEndpointConfigurationCreate


async def create_llm_endpoint(
    db: AsyncSession, llm_endpoint_create: LLMEndpointCreate, user_id: str
) -> LLMEndpoint:
    endpoint_plugin = get_endpoint_plugin(llm_endpoint_create.configuration.type)

    now = datetime.now()

    llm_endpoint = LLMEndpoint(
        id=str(uuid4()),
        type=llm_endpoint_create.configuration.type,
        name=llm_endpoint_create.name,
        endpoint_config=endpoint_plugin.configuration_from_create_data(
            llm_endpoint_create.configuration
        ).to_db_json(),
        created_at=now,
        created_by=user_id,
        updated_at=now,
        updated_by=user_id,
    )

    db.add(llm_endpoint)
    await db.flush()

    return llm_endpoint
