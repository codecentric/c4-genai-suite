from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import Evaluation, EvaluationStatus
from llm_eval.db import OptimisticLockingError


async def update_evaluation_status(
    session: AsyncSession,
    evaluation_id: str,
    status: EvaluationStatus,
    version: int | None = None,
    error: str | None = None,
) -> None:
    statement = (
        update(Evaluation)
        .where(Evaluation.id == evaluation_id)
        .values(status=status, error=error)
    )

    if version is not None:
        statement = statement.where(Evaluation.version == version)

    result = await session.execute(statement)

    # noinspection PyTypeChecker
    if version is not None and result.rowcount <= 0:
        raise OptimisticLockingError("No update performed.")
