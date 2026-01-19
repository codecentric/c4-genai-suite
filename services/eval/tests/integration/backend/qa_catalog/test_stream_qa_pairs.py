from uuid import uuid4

import pytest
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog, QACatalogGroup, QAPair
from llm_eval.qa_catalog.db.stream_qa_pairs import stream_qa_pairs


@pytest.mark.asyncio
async def test_steam_qa_pairs(test_session: AsyncSession) -> None:
    catalog_group = QACatalogGroup(id="gid", name="name")

    catalog = QACatalog(id="cid", qa_catalog_group_id="gid")

    other_catalog = QACatalog(id="other_id", qa_catalog_group_id="gid")

    test_session.add(catalog_group)
    test_session.add(catalog)
    test_session.add(other_catalog)

    pairs = [
        QAPair(
            id=str(uuid4()),
            question=f"question_{i}",
            expected_output=f"expected_output_{i}",
            contexts=f"contexts_{i}",
            meta_data=f"meta_data_{i}",
            qa_catalog_id="cid",
        )
        for i in range(0, 10)
    ]

    pairs.append(
        QAPair(
            id=str(uuid4()),
            question="question",
            expected_output="expected_output",
            contexts="contexts",
            meta_data="meta_data",
            qa_catalog_id="other_id",
        )
    )

    test_session.add_all(pairs)

    stream = [r async for r in stream_qa_pairs(test_session, "cid", 2)]

    assert len(stream) == 10

    for i in range(10):
        assert stream[i].question == f"question_{i}"
