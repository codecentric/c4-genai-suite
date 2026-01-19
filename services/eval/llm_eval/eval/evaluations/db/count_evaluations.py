from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import Evaluation


async def count_evaluations(db: AsyncSession) -> int:
    count_select = select(func.count()).select_from(Evaluation)

    return (await db.execute(count_select)).scalar()
