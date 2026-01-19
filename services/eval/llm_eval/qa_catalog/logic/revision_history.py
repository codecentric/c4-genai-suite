from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog
from llm_eval.qa_catalog.db.find_qa_catalog_by_group import (
    find_qa_catalogs_by_group,
)
from llm_eval.qa_catalog.models import (
    QACatalogVersionHistory,
    QACatalogVersionHistoryItem,
)


async def create_qa_catalog_revision_history(
    db: AsyncSession, catalog: QACatalog
) -> QACatalogVersionHistory:
    history: list[QACatalogVersionHistoryItem] = []

    for older_catalog in await find_qa_catalogs_by_group(
        db, catalog.qa_catalog_group_id
    ):
        history.append(
            QACatalogVersionHistoryItem(
                version_id=older_catalog.id,
                created_at=older_catalog.created_at,
                revision=older_catalog.revision,
            )
        )

    history = sorted(history, key=lambda x: x.created_at, reverse=True)
    return QACatalogVersionHistory(versions=history)
