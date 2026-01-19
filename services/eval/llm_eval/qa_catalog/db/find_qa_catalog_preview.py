from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count

from llm_eval.database.model import QACatalog, QACatalogGroup, QAPair
from llm_eval.qa_catalog.models import QACatalogPreview


async def find_qa_catalog_preview(
    db: AsyncSession, catalog_id: str
) -> QACatalogPreview | None:
    query = (
        select(
            QACatalog.id,
            QACatalogGroup.name,
            QACatalog.created_at,
            QACatalog.updated_at,
            QACatalog.status,
            QACatalog.revision,
            count(QAPair.id).label("length"),
        )
        .join(
            QACatalog.qa_pairs,
            isouter=True,
        )
        .join(QACatalog.qa_catalog_group, isouter=True)
        .where(QACatalog.id == catalog_id)
        .group_by(
            QACatalog.id,
            QACatalogGroup.name,
            QACatalog.created_at,
            QACatalog.updated_at,
            QACatalog.status,
        )
    )

    result = await db.execute(query)
    row = result.first()

    if row:
        return QACatalogPreview(
            id=row.id,
            name=row.name,
            created_at=row.created_at,
            updated_at=row.updated_at,
            status=row.status,
            revision=row.revision,
            length=row.length,
        )

    return None
