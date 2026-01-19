from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog, QACatalogStatus


async def update_qa_catalog(db: AsyncSession, qa_catalog: QACatalog) -> QACatalog:
    qa_catalog.status = QACatalogStatus.READY

    db.add(qa_catalog)

    await db.flush()

    return qa_catalog
