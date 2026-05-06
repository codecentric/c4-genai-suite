from sqlalchemy import Sequence, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog


async def find_qa_catalog_with_latest_revision(
    db: AsyncSession, catalog_group_id: str
) -> QACatalog | None:
    query = (
        select(QACatalog)
        .join(
            QACatalog.qa_pairs,
            isouter=True,
        )
        .join(QACatalog.qa_catalog_group, isouter=True)
        .where(QACatalog.qa_catalog_group_id == catalog_group_id)
        .order_by(QACatalog.revision.desc())
        .limit(1)
    )

    return (await db.scalars(query)).one_or_none()


async def find_qa_catalogs_by_group(
    db: AsyncSession, catalog_group_id: str
) -> Sequence[QACatalog]:
    query = (
        select(QACatalog)
        .where(QACatalog.qa_catalog_group_id == catalog_group_id)
        .order_by(QACatalog.revision.desc())
    )
    return (await db.execute(query)).scalars().all()
