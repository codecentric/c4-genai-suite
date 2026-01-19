from datetime import datetime
from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    EvaluationMetric,
)
from llm_eval.metrics.plugins.api_models import MetricConfigurationCreate
from llm_eval.metrics.plugins.factory import get_metric_plugin
from llm_eval.schemas import ApiModel


class MetricCreate(ApiModel):
    configuration: MetricConfigurationCreate


async def create_metric(
    db: AsyncSession, metric_create: MetricCreate, user_id: str
) -> EvaluationMetric:
    metric_plugin = get_metric_plugin(metric_create.configuration.type)

    now = datetime.now()

    metric = EvaluationMetric(
        id=str(uuid4()),
        metric_config=metric_plugin.configuration_from_create_data(
            metric_create.configuration
        ).to_db_json(),
        created_at=now,
        created_by=user_id,
        updated_at=now,
        updated_by=user_id,
    )

    db.add(metric)
    await db.flush()

    return metric
