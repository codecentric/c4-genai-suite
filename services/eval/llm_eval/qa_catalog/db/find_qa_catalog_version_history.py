from datetime import datetime
from typing import cast

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog


async def find_previous_qa_catalog(
    db: AsyncSession, parent_id: str
) -> tuple[str, datetime] | None:
    subquery = (
        select(QACatalog.previous_version_id)
        .where(cast(ColumnElement[bool], QACatalog.id == parent_id))
        .scalar_subquery()
    )

    res = (
        await db.execute(
            select(QACatalog.id, QACatalog.updated_at)
            .where(cast(ColumnElement[bool], QACatalog.id == subquery))
            .limit(1),
        )
    ).first()

    if res:
        return res[0], res[1]

    return None
