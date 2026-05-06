from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog, QACatalogGroup, QAPair
from llm_eval.qa_catalog.models import QACatalogPreview


async def find_qa_catalog_previews(
    db: AsyncSession, limit: int, offset: int, name: str | None
) -> list[QACatalogPreview]:
    subquery = (
        select(
            QACatalog.qa_catalog_group_id,
            func.max(QACatalog.revision).label("max_version"),
        )
        .group_by(QACatalog.qa_catalog_group_id)
        .subquery()
    )

    statement = (
        select(
            QACatalog.id,
            QACatalog.created_at,
            QACatalog.updated_at,
            QACatalog.revision,
            QACatalog.status,
            QACatalogGroup.name,
            func.count(QAPair.id).label("length"),
        )
        .join(QACatalog.qa_pairs, isouter=True)
        .join(QACatalog.qa_catalog_group, isouter=True)
        .join(
            subquery,
            and_(
                QACatalog.qa_catalog_group_id == subquery.c.qa_catalog_group_id,
                QACatalog.revision == subquery.c.max_version,
            ),
        )
    )

    if name:
        statement = statement.where(QACatalogGroup.name.ilike(f"%{name}%"))

    statement = (
        statement.group_by(
            QACatalog.id,
            QACatalog.created_at,
            QACatalog.updated_at,
            QACatalog.status,
            QACatalogGroup.name,
        )
        .order_by(QACatalogGroup.name, QACatalog.id)
        .limit(limit)
        .offset(offset)
    )

    return [
        QACatalogPreview.model_validate(result._mapping)
        for result in (await db.execute(statement)).fetchall()
    ]
