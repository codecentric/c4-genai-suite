from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class LLMEndpointDelete(ApiModel):
    version: int


async def delete_llm_endpoint(
    db: AsyncSession, llm_endpoint_id: str, llm_endpoint_delete: LLMEndpointDelete
) -> None:
    llm_endpoint = await find_llm_endpoint(db, llm_endpoint_id)
    if llm_endpoint is None:
        return

    if llm_endpoint.version != llm_endpoint_delete.version:
        raise entity_outdated()

    await db.delete(llm_endpoint)
    await db.flush()
