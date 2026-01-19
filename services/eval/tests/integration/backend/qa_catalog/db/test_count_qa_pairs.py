import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair
from llm_eval.qa_catalog.db.count_qa_pairs import count_qa_pairs
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,
    _create_qa_catalog_group_entity,
)


@pytest.mark.asyncio
async def test_count_qa_pairs(test_session: AsyncSession) -> None:
    length = 5
    catalog = _create_qa_catalog_entity(
        _create_qa_catalog_group_entity("test_catalog_group"),
        [
            SyntheticQAPair(
                id=str(i),
                contexts=["c"],
                question="q",
                expected_output="e",
                meta_data={},
            )
            for i in range(length)
        ],
    )

    test_session.add(catalog)
    await test_session.flush()

    assert (await count_qa_pairs(test_session, catalog.id)) == length
