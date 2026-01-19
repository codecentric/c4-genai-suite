from datetime import datetime

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    LLMEndpoint,
)
from llm_eval.eval.evaluations.db.find_evaluation import find_evaluation
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class EvaluationUpdate(ApiModel):
    name: str | None = None
    version: int


async def update_evaluation(
    db: AsyncSession,
    evaluation_id: str,
    evaluation_update: EvaluationUpdate,
    user_id: str,
) -> LLMEndpoint | None:
    evaluation = await find_evaluation(db, evaluation_id)
    if evaluation is None:
        return None

    if evaluation.version != evaluation_update.version:
        raise entity_outdated()

    now = datetime.now()

    evaluation.updated_at = now
    evaluation.updated_by = user_id

    if evaluation_update.name is not None:
        evaluation.name = evaluation_update.name

    await db.flush()

    return evaluation
