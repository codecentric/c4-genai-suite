import pytest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog
from llm_eval.qa_catalog.db.insert_qa_catalog import insert_qa_catalog
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)


@pytest.mark.asyncio
async def test_insert_catalog_new_group(test_session: AsyncSession) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])

    await insert_qa_catalog(test_session, qa_catalog_1)

    res = (
        await test_session.scalars(
            select(QACatalog).where(QACatalog.id == qa_catalog_1.id)
        )
    ).one_or_none()

    assert res is not None
    assert res.id == qa_catalog_1.id


@pytest.mark.asyncio
async def test_insert_catalog_existing_group(test_session: AsyncSession) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    test_session.add(qa_catalog_group1)
    await test_session.flush()

    qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])

    await insert_qa_catalog(test_session, qa_catalog_1)

    res = (
        await test_session.scalars(
            select(QACatalog).where(QACatalog.id == qa_catalog_1.id)
        )
    ).one_or_none()

    assert res is not None
    assert res.id == qa_catalog_1.id
