from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.metrics.db.find_metric import find_metric
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class MetricDelete(ApiModel):
    version: int


async def delete_metric(
    db: AsyncSession, metric_id: str, metric_delete: MetricDelete
) -> None:
    metric = await find_metric(db, metric_id)
    if metric is None:
        return

    if metric.version != metric_delete.version:
        raise entity_outdated()

    await db.delete(metric)
    await db.flush()
