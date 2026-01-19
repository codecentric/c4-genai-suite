from typing import cast
from uuid import uuid4

from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalogGeneratorTempDataSourceConfig
from llm_eval.qa_catalog.generator.interface import (
    QACatalogGeneratorDataSourceConfig,
)


async def find_data_source_config(
    db: AsyncSession, id: str
) -> QACatalogGeneratorTempDataSourceConfig | None:
    return (
        await db.scalars(
            select(QACatalogGeneratorTempDataSourceConfig).where(
                cast(
                    ColumnElement[bool], QACatalogGeneratorTempDataSourceConfig.id == id
                )
            )
        )
    ).one_or_none()


async def create_temp_data_source_config(
    db: AsyncSession,
    data_source_config: QACatalogGeneratorDataSourceConfig,
) -> str:
    tmp_data_soure_config = QACatalogGeneratorTempDataSourceConfig(
        id=str(uuid4()), config=data_source_config.to_db_json()
    )

    db.add(tmp_data_soure_config)

    return tmp_data_soure_config.id


async def delete_data_source_config(
    db: AsyncSession, data_source_config: QACatalogGeneratorTempDataSourceConfig
) -> None:
    await db.delete(data_source_config)
