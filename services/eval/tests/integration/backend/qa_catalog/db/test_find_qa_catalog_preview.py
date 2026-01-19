import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.db.find_qa_catalog_preview import (
    find_qa_catalog_preview,
)
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,
    _create_qa_catalog_group_entity,
)


@pytest.mark.asyncio
async def test_get_catalog_does_not_exists_return_none(
    test_session: AsyncSession,
) -> None:
    res = await find_qa_catalog_preview(test_session, "does not exist")
    assert res is None


@pytest.mark.asyncio
async def test_get_catalog_by_id(test_session: AsyncSession) -> None:
    qa_catalog_group = _create_qa_catalog_group_entity(name="test1")
    qa_catalog = _create_qa_catalog_entity(qa_catalog_group, [])
    test_session.add(qa_catalog)

    await test_session.flush()

    res = await find_qa_catalog_preview(test_session, qa_catalog.id)

    assert res is not None
    assert res.id == qa_catalog.id
    assert res.name == "test1"
    assert res.length == 0
