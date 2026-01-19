from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Query
from starlette import status

from llm_eval.database import model
from llm_eval.db import SessionDep
from llm_eval.llm_endpoints.db.find_llm_endpoint import (
    find_llm_endpoint,
    find_llm_endpoints,
)
from llm_eval.llm_endpoints.logic.create_llm_endpoint import (
    LLMEndpointCreate,
    create_llm_endpoint,
)
from llm_eval.llm_endpoints.logic.delete_llm_endpoint import (
    LLMEndpointDelete,
    delete_llm_endpoint,
)
from llm_eval.llm_endpoints.logic.update_llm_endpoint import (
    LLMEndpointUpdate,
    update_llm_endpoint,
)
from llm_eval.llm_endpoints.plugins.api_models import (
    LLMEndpointConfigurationRead,
)
from llm_eval.llm_endpoints.plugins.factory import (
    get_endpoint_plugin,
    plugins,
)
from llm_eval.llm_endpoints.plugins.interface import PluginFeature
from llm_eval.responses import not_found, not_found_response
from llm_eval.schemas import ApiModel
from llm_eval.utils.api import PaginationParamsDep, UserPrincipalDep

router = APIRouter(prefix="/llm-endpoints", tags=["llm-endpoints"])


class LLMEndpoint(ApiModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    supported_features: list[PluginFeature]
    configuration: LLMEndpointConfigurationRead
    version: int


class LLMEndpointType(ApiModel):
    name: str
    supported_features: list[PluginFeature]


class LLMEndpointTypesResponse(ApiModel):
    types: list[LLMEndpointType]


async def llm_endpoint_to_api_model(endpoint: model.LLMEndpoint) -> LLMEndpoint:
    endpoint_plugin = get_endpoint_plugin(endpoint.type)

    configuration = endpoint_plugin.configuration_from_db_json(endpoint.endpoint_config)

    return LLMEndpoint(
        id=endpoint.id,
        name=endpoint.name,
        created_at=endpoint.created_at,
        updated_at=endpoint.updated_at,
        configuration=endpoint_plugin.create_read_model_from_configuration(
            configuration
        ),
        supported_features=endpoint_plugin.get_supported_features(),
        version=endpoint.version,
    )


@router.get("")
async def get_all(
    db: SessionDep,
    pagination_params: PaginationParamsDep,
    q: str | None = None,
    supported_features: Annotated[list[PluginFeature] | None, Query()] = None,
) -> list[LLMEndpoint]:
    llm_endpoints = await find_llm_endpoints(
        db, pagination_params, q, supported_features
    )
    return [
        await llm_endpoint_to_api_model(llm_endpoint) for llm_endpoint in llm_endpoints
    ]


@router.get("/types")
async def get_types() -> LLMEndpointTypesResponse:
    return LLMEndpointTypesResponse(
        types=[
            LLMEndpointType(
                name=plugin.endpoint_type,
                supported_features=plugin.get_supported_features(),
            )
            for plugin in plugins
        ]
    )


@router.get("/{llm_endpoint_id}")
async def get(db: SessionDep, llm_endpoint_id: str) -> LLMEndpoint:
    llm_endpoint = await find_llm_endpoint(db, llm_endpoint_id)
    if not llm_endpoint:
        raise not_found("LLM endpoint not found.")

    return await llm_endpoint_to_api_model(llm_endpoint)


@router.delete("/{llm_endpoint_id}")
async def delete(
    db: SessionDep, llm_endpoint_id: str, llm_endpoint_delete: LLMEndpointDelete
) -> None:
    await delete_llm_endpoint(db, llm_endpoint_id, llm_endpoint_delete)


@router.post("", status_code=status.HTTP_201_CREATED)
async def post(
    db: SessionDep, llm_endpoint_create: LLMEndpointCreate, principal: UserPrincipalDep
) -> LLMEndpoint:
    llm_endpoint = await create_llm_endpoint(db, llm_endpoint_create, principal.id)

    return await llm_endpoint_to_api_model(llm_endpoint)


@router.patch("/{llm_endpoint_id}", responses={**not_found_response})
async def patch(
    db: SessionDep,
    llm_endpoint_id: str,
    llm_endpoint_update: LLMEndpointUpdate,
    principal: UserPrincipalDep,
) -> LLMEndpoint:
    llm_endpoint = await update_llm_endpoint(
        db, llm_endpoint_id, llm_endpoint_update, principal.id
    )
    if not llm_endpoint:
        raise not_found("LLM endpoint not found.")

    return await llm_endpoint_to_api_model(llm_endpoint)
