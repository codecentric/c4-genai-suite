from datetime import datetime

from fastapi import APIRouter, status

from llm_eval.database.model import EvaluationMetric
from llm_eval.db import SessionDep
from llm_eval.metrics.db.find_metric import find_metric, find_metrics
from llm_eval.metrics.logic.create_metric import MetricCreate, create_metric
from llm_eval.metrics.logic.delete_metric import MetricDelete, delete_metric
from llm_eval.metrics.logic.update_metric import MetricUpdate, update_metric
from llm_eval.metrics.plugins.api_models import MetricConfigurationRead
from llm_eval.metrics.plugins.factory import (
    get_metric_plugin,
    get_metric_plugin_types,
)
from llm_eval.responses import not_found, not_found_response
from llm_eval.schemas import ApiModel
from llm_eval.utils.api import PaginationParamsDep, UserPrincipalDep

router = APIRouter(prefix="/metrics", tags=["metrics"])


class Metric(ApiModel):
    id: str
    created_at: datetime
    updated_at: datetime
    configuration: MetricConfigurationRead
    version: int


class MetricTypesResponse(ApiModel):
    types: list[str]


def metric_to_api_model(metric: EvaluationMetric) -> Metric:
    metric_plugin = get_metric_plugin(metric)

    configuration = metric_plugin.configuration_from_db_json(metric.metric_config)

    return Metric(
        id=metric.id,
        created_at=metric.created_at,
        updated_at=metric.updated_at,
        version=metric.version,
        configuration=metric_plugin.create_read_model_from_configuration(configuration),
    )


@router.get("")
async def get_all(
    db: SessionDep,
    pagination_params: PaginationParamsDep,
) -> list[Metric]:
    metrics = await find_metrics(db, pagination_params)
    return [metric_to_api_model(metric) for metric in metrics]


@router.get("/types")
async def get_types() -> MetricTypesResponse:
    return MetricTypesResponse(types=get_metric_plugin_types())


@router.get("/{metric_id}")
async def get(db: SessionDep, metric_id: str) -> Metric:
    metric = await find_metric(db, metric_id)
    if not metric:
        raise not_found("Metric not found.")

    return metric_to_api_model(metric)


@router.delete("/{metric_id}")
async def delete(db: SessionDep, metric_id: str, metric_delete: MetricDelete) -> None:
    await delete_metric(db, metric_id, metric_delete)


@router.post("", status_code=status.HTTP_201_CREATED)
async def post(
    db: SessionDep, metric_create: MetricCreate, principal: UserPrincipalDep
) -> Metric:
    metric = await create_metric(db, metric_create, principal.id)

    return metric_to_api_model(metric)


@router.patch("/{metric_id}", responses={**not_found_response})
async def patch(
    db: SessionDep,
    metric_id: str,
    metric_update: MetricUpdate,
    principal: UserPrincipalDep,
) -> Metric:
    metric = await update_metric(db, metric_id, metric_update, principal.id)
    if not metric:
        raise not_found("Metric not found.")

    return metric_to_api_model(metric)
