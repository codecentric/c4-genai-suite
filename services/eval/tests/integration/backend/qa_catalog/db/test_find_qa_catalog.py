import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalogStatus
from llm_eval.qa_catalog.db.find_qa_catalog import find_qa_catalog
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)


@pytest.mark.asyncio
async def test_find_does_not_exists_return_none(test_session: AsyncSession) -> None:
    res = await find_qa_catalog(test_session, "999")
    assert res is None


@pytest.mark.asyncio
async def test_find_does_exists_return_catalog(test_session: AsyncSession) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1.id = "1"
    qa_catalog_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_2.id = "2"
    qa_catalog_2.status = QACatalogStatus.READY
    qa_catalog_3 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_3.id = "3"

    test_session.add(qa_catalog_1)
    test_session.add(qa_catalog_2)
    test_session.add(qa_catalog_3)

    await test_session.flush()
    test_session.expire_all()

    res = await find_qa_catalog(test_session, "2")

    assert res is not None
    assert res.id == "2"
    assert res.status == QACatalogStatus.READY
    assert res.qa_catalog_group.id == qa_catalog_group1.id
    assert res.qa_catalog_group.name == qa_catalog_group1.name
