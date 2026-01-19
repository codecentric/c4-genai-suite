from typing import AsyncIterator

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    QAPair,
)


async def stream_qa_pairs(
    db: AsyncSession, catalog_id: str, partition_size: int = 1000
) -> AsyncIterator[QAPair]:
    statement = select(QAPair).where(QAPair.qa_catalog_id == catalog_id)

    async for partition in (await db.stream(statement)).partitions(partition_size):
        for row in partition:
            yield row[0]
