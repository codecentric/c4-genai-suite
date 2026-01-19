from typing import cast

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Mapped

from llm_eval.database.model import QACatalog


async def find_qa_catalog(
    db: AsyncSession, catalog_id: str | Mapped[str]
) -> QACatalog | None:
    query = select(QACatalog).where(
        cast(ColumnElement[bool], QACatalog.id == catalog_id)
    )

    return (await db.scalars(query)).one_or_none()
