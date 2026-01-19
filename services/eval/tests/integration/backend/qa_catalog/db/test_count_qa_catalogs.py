import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.db.count_qa_catalogs import count_qa_catalogs
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,
    _create_qa_catalog_group_entity,
)


@pytest.mark.asyncio
async def test_count_qa_catalogs(test_session: AsyncSession) -> None:
    group = _create_qa_catalog_group_entity("test_catalog_group")
    length = 5

    test_session.add_all([_create_qa_catalog_entity(group, []) for _ in range(length)])
    await test_session.flush()

    assert (await count_qa_catalogs(test_session)) == length
