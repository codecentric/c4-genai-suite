import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,
    _create_qa_catalog_group_entity,
)
from llm_eval.qa_catalog.logic.download import _all_pairs
from llm_eval.qa_catalog.models import QAPair


@pytest.mark.asyncio
async def test__all_pairs(test_session: AsyncSession) -> None:
    expected_length = 10
    qa_pairs = [
        SyntheticQAPair(
            id=str(i),
            contexts=["c"],
            question="q",
            expected_output="e",
            meta_data={},
        )
        for i in range(expected_length)
    ]

    catalog = _create_qa_catalog_entity(
        _create_qa_catalog_group_entity(name="test_group"),
        qa_pairs,
    )

    test_session.add(catalog)
    await test_session.flush()

    result = await _all_pairs(test_session, catalog.id, 1, 0)

    assert len(result) == expected_length
    assert all(isinstance(pair, QAPair) for pair in result)
