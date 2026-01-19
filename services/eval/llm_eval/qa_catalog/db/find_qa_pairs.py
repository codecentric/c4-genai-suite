from typing import Sequence, cast

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QAPair


async def find_qa_pairs(
    db: AsyncSession, catalog_id: str, limit: int, offset: int
) -> Sequence[QAPair]:
    statement = (
        select(QAPair)
        .where(cast(ColumnElement[bool], QAPair.qa_catalog_id == catalog_id))
        .order_by(QAPair.id)
        .limit(limit)
        .offset(offset)
    )

    return (await db.execute(statement)).scalars().all()
