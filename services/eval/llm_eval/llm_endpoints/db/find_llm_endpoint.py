from typing import Sequence, cast

from sqlalchemy import ColumnElement, asc, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import LLMEndpoint
from llm_eval.llm_endpoints.plugins.factory import plugins
from llm_eval.llm_endpoints.plugins.interface import PluginFeature
from llm_eval.utils.api import PaginationParams


async def find_llm_endpoints(
    db: AsyncSession,
    pagination_params: PaginationParams,
    query: str | None,
    supported_features: list[PluginFeature] | None,
) -> Sequence[LLMEndpoint]:
    s = select(LLMEndpoint)

    if query:
        s = s.where(LLMEndpoint.name.ilike(f"%{query}%"))

    if supported_features and len(supported_features) > 0:
        endpoint_types = [
            plugin.endpoint_type
            for plugin in plugins
            if any(
                [
                    feature in supported_features
                    for feature in plugin.get_supported_features()
                ]
            )
        ]
        s = s.where(LLMEndpoint.endpoint_config["type"].astext.in_(endpoint_types))

    statement = (
        s.order_by(asc(LLMEndpoint.name), asc(LLMEndpoint.id))
        .limit(pagination_params.limit)
        .offset(pagination_params.offset)
    )

    return (await db.scalars(statement)).unique().all()


async def find_llm_endpoint(db: AsyncSession, endpoint_id: str) -> LLMEndpoint | None:
    return (
        await db.scalars(
            select(LLMEndpoint).where(
                cast(ColumnElement[bool], LLMEndpoint.id == endpoint_id)
            )
        )
    ).one_or_none()
