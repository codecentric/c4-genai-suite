import pytest
from sqlalchemy.ext.asyncio import AsyncSession
from llm_eval.qa_catalog.db.find_qa_catalog_previews import (
    find_qa_catalog_previews,
)

from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)


@pytest.mark.asyncio
async def test_get_empty(test_session: AsyncSession) -> None:
    res = await find_qa_catalog_previews(test_session, 999, 999, None)
    assert res == []


@pytest.mark.asyncio
async def test_get_many_ensure_latest_versions_only(test_session: AsyncSession) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2.revision = 2

    qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
    qa_catalog_2_1 = _create_qa_catalog_entity(qa_catalog_group2, [])
    test_session.add(qa_catalog_1_1)
    test_session.add(qa_catalog_1_2)
    test_session.add(qa_catalog_2_1)

    await test_session.flush()
    res = await find_qa_catalog_previews(test_session, 999, 0, None)
    assert len(res) == 2

    assert res[0].name == "test1"
    assert res[0].revision == 2
    assert res[1].name == "test2"
    assert res[1].revision == 1


@pytest.mark.asyncio
async def test_get_by_name_ensure_latest_versions_only(
    test_session: AsyncSession,
) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2.revision = 2

    qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
    qa_catalog_2_1 = _create_qa_catalog_entity(qa_catalog_group2, [])
    test_session.add(qa_catalog_1_1)
    test_session.add(qa_catalog_1_2)
    test_session.add(qa_catalog_2_1)

    await test_session.flush()
    res = await find_qa_catalog_previews(test_session, 999, 0, "test1")
    assert len(res) == 1

    assert res[0].name == "test1"
    assert res[0].revision == 2


@pytest.mark.asyncio
async def test_limit_and_offset_ensure_latest_versions_only(
    test_session: AsyncSession,
) -> None:
    qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
    qa_catalog_1_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
    qa_catalog_1_2.revision = 2

    qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
    qa_catalog_2_1 = _create_qa_catalog_entity(qa_catalog_group2, [])

    qa_catalog_group3 = _create_qa_catalog_group_entity(name="test3")
    qa_catalog_3_1 = _create_qa_catalog_entity(qa_catalog_group3, [])
    qa_catalog_3_2 = _create_qa_catalog_entity(qa_catalog_group3, [])
    qa_catalog_3_2.revision = 2

    qa_catalog_group4 = _create_qa_catalog_group_entity(name="test4")
    qa_catalog_4_1 = _create_qa_catalog_entity(qa_catalog_group4, [])

    qa_catalog_group5 = _create_qa_catalog_group_entity(name="test5")
    qa_catalog_5_1 = _create_qa_catalog_entity(qa_catalog_group5, [])

    test_session.add(qa_catalog_1_1)
    test_session.add(qa_catalog_1_2)
    test_session.add(qa_catalog_2_1)
    test_session.add(qa_catalog_3_1)
    test_session.add(qa_catalog_3_2)
    test_session.add(qa_catalog_4_1)
    test_session.add(qa_catalog_5_1)

    await test_session.flush()
    res = await find_qa_catalog_previews(test_session, 3, 1, None)
    assert len(res) == 3

    assert res[0].name == "test2"
    assert res[0].revision == 1

    assert res[1].name == "test3"
    assert res[1].revision == 2

    assert res[2].name == "test4"
    assert res[2].revision == 1
