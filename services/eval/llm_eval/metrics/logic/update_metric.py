from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    EvaluationMetric,
)
from llm_eval.metrics.db.find_metric import find_metric
from llm_eval.metrics.plugins.api_models import (
    MetricConfigurationUpdate,
)
from llm_eval.metrics.plugins.factory import get_metric_plugin
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class MetricUpdate(ApiModel):
    version: int
    configuration: MetricConfigurationUpdate


async def update_metric(
    db: AsyncSession,
    metric_id: str,
    metric_update: MetricUpdate,
    user_id: str,
) -> EvaluationMetric | None:
    metric = await find_metric(db, metric_id)
    if metric is None:
        return None

    if metric.version != metric_update.version:
        raise entity_outdated()

    metric_plugin = get_metric_plugin(metric_update.configuration.type)

    now = datetime.now()

    metric.updated_at = now
    metric.updated_by = user_id

    configuration = metric_plugin.configuration_from_db_json(metric.metric_config)
    configuration = metric_plugin.update_configuration(
        configuration, metric_update.configuration
    )

    metric.metric_config = configuration.to_db_json()

    await db.flush()

    return metric
