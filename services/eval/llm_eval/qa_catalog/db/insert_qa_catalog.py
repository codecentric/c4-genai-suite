from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog


async def insert_qa_catalog(db: AsyncSession, qa_catalog: QACatalog) -> QACatalog:
    db.add(qa_catalog.qa_catalog_group)
    db.add(qa_catalog)

    await db.flush()

    return qa_catalog
