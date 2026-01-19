from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog


async def delete_qa_catalog(db: AsyncSession, catalog: QACatalog) -> None:
    await db.delete(catalog)
    await db.flush()

    return None
