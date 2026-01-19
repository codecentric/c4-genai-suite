from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.eval.evaluations.db.find_evaluation import find_evaluation
from llm_eval.responses import entity_outdated
from llm_eval.schemas import ApiModel


class EvaluationDelete(ApiModel):
    version: int


async def delete_evaluation(
    db: AsyncSession, evaluation_id: str, evaluation_delete: EvaluationDelete
) -> None:
    evaluation = await find_evaluation(db, evaluation_id)
    if evaluation is None:
        return None

    if evaluation.version != evaluation_delete.version:
        raise entity_outdated()

    await db.delete(evaluation)
    await db.flush()
