import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.db.find_qa_catalog_by_group import (
    find_qa_catalog_with_latest_revision,
    find_qa_catalogs_by_group,
)
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)


@pytest.mark.asyncio
async def test_find_highest_version_group_does_not_exists_return_none(
    test_session: AsyncSession,
) -> None:
    assert None is await find_qa_catalog_with_latest_revision(test_session, "999")


@pytest.mark.asyncio
async def test_find_highest_version_does_exists_return_catalog(
    test_session: AsyncSession,
) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1.id = "1"
    qa_catalog_1.revision = 1
    qa_catalog_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_2.id = "2"
    qa_catalog_2.revision = 2
    qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
    qa_catalog_3 = _create_qa_catalog_entity(qa_catalog_group2, [])
    qa_catalog_3.id = "3"
    qa_catalog_3.revision = 3

    test_session.add(qa_catalog_1)
    test_session.add(qa_catalog_2)
    test_session.add(qa_catalog_3)

    await test_session.flush()

    res = await find_qa_catalog_with_latest_revision(test_session, qa_catalog_group1.id)

    assert res is not None
    assert res.id == "2"
    assert res.qa_catalog_group.id == qa_catalog_group1.id
    assert res.revision == 2


@pytest.mark.asyncio
async def test_find_by_group_does_exists_return_catalogs(
    test_session: AsyncSession,
) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1.id = "1"
    qa_catalog_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_2.id = "2"
    qa_catalog_3 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_3.id = "3"

    qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
    qa_catalog_4 = _create_qa_catalog_entity(qa_catalog_group2, [])
    qa_catalog_4.id = "4"

    test_session.add(qa_catalog_1)
    test_session.add(qa_catalog_2)
    test_session.add(qa_catalog_3)
    test_session.add(qa_catalog_4)

    await test_session.flush()

    res = await find_qa_catalogs_by_group(test_session, qa_catalog_group1.id)

    assert len(res) == 3
    assert res[0].id == qa_catalog_1.id
    assert res[0].created_at == qa_catalog_1.created_at
    assert res[1].id == qa_catalog_2.id
    assert res[1].created_at == qa_catalog_2.created_at
    assert res[2].id == qa_catalog_3.id
    assert res[2].created_at == qa_catalog_3.created_at
