from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog


async def count_qa_catalogs(db: AsyncSession) -> int:
    count_select = select(func.count()).select_from(QACatalog)

    return (await db.execute(count_select)).scalar()
