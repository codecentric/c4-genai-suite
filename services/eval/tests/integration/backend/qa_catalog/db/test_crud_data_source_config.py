from pathlib import Path

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalogGeneratorTempDataSourceConfig
from llm_eval.qa_catalog.db.crud_data_source_config import (
    create_temp_data_source_config,
    delete_data_source_config,
    find_data_source_config,
)
from llm_eval.qa_catalog.generator.interface import (
    QACatalogGeneratorDataSourceConfig,
)


@pytest.mark.asyncio
async def test_find_data_source_config(test_session: AsyncSession) -> None:
    test_session.add(QACatalogGeneratorTempDataSourceConfig(id="test_id", config={}))
    await test_session.flush()

    data_source_config = await find_data_source_config(test_session, "test_id")

    assert data_source_config is not None
    assert data_source_config.id == "test_id"


@pytest.mark.asyncio
async def test_find_data_source_config_not_found(test_session: AsyncSession) -> None:
    data_source_config = await find_data_source_config(test_session, "non_existent_id")

    assert data_source_config is None


@pytest.mark.asyncio
async def test_create_temp_data_source_config(test_session: AsyncSession) -> None:
    # Define a dummy data source config implementing to_db_json()
    config = QACatalogGeneratorDataSourceConfig(
        type="RAGAS",
        data_source_location=Path("test_location"),
        data_source_glob=["test_glob"],
    )

    # Create a temporary data source config record
    new_id = await create_temp_data_source_config(test_session, config)
    # Flush to persist the added record
    await test_session.flush()

    # Retrieve the record using its new id
    db_config = await find_data_source_config(test_session, new_id)
    assert db_config is not None

    data_source_config = QACatalogGeneratorDataSourceConfig.from_db_json(
        db_config.config
    )

    assert db_config.id == new_id
    assert data_source_config == config


@pytest.mark.asyncio
async def test_delete_data_source_config(test_session: AsyncSession) -> None:
    # Define a dummy data source config implementing to_db_json()
    config = QACatalogGeneratorDataSourceConfig(
        type="RAGAS",
        data_source_location=Path("test_location"),
        data_source_glob=["test_glob"],
    )

    new_id = await create_temp_data_source_config(test_session, config)
    await test_session.flush()

    db_config = await find_data_source_config(test_session, new_id)
    assert db_config is not None

    await delete_data_source_config(test_session, db_config)

    assert await find_data_source_config(test_session, new_id) is None
