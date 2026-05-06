from typing import cast

from sqlalchemy import ColumnElement, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QAPair


async def count_qa_pairs(db: AsyncSession, catalog_id: str) -> int:
    statement = select(func.count(QAPair.id)).where(
        cast(ColumnElement[bool], QAPair.qa_catalog_id == catalog_id)
    )

    return (await db.scalars(statement)).unique().one()
