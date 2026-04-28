from typing import cast

import pytest
from sqlalchemy import ColumnElement, select
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog, QAPair
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,
    _create_qa_catalog_group_entity,
    create_qa_catalog,
    store_qa_pairs,
)
from llm_eval.qa_catalog.logic.utils import synthethic_qa_pairs_to_db_models
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


@pytest.mark.asyncio
async def test_add_qa_pairs_to_catalog(test_session: AsyncSession) -> None:
    qa_catalog_group = _create_qa_catalog_group_entity(name="test_group")
    qa_catalog = _create_qa_catalog_entity(qa_catalog_group, [])

    test_session.add(qa_catalog_group)
    test_session.add(qa_catalog)
    await test_session.flush()

    qa_pairs = [
        SyntheticQAPair(
            id="qa1",
            question="Test question 1",
            expected_output="Test answer 1",
            contexts=["context 1"],
            meta_data={"source": "test"},
        ),
        SyntheticQAPair(
            id="qa2",
            question="Test question 2",
            expected_output="Test answer 2",
            contexts=["context 2"],
            meta_data={"source": "test"},
        ),
    ]

    store_qa_pairs(
        test_session,
        synthethic_qa_pairs_to_db_models(qa_pairs, qa_catalog.id),
    )
    await test_session.flush()

    result = (
        await test_session.scalars(
            select(QAPair).where(
                cast(ColumnElement[bool], QAPair.qa_catalog_id == qa_catalog.id)
            )
        )
    ).all()

    assert len(result) == 2

    assert result[0].id == "qa1"
    assert result[0].question == "Test question 1"
    assert result[0].expected_output == "Test answer 1"
    assert result[0].contexts == ["context 1"]
    assert result[0].meta_data == {"source": "test"}
    assert result[1].id == "qa2"
    assert result[1].question == "Test question 2"


@pytest.mark.asyncio
async def test_create_qa_catalog(test_session: AsyncSession) -> None:
    # Create synthetic QA pairs
    qa_pairs = [
        SyntheticQAPair(
            id="qa_create_1",
            question="Create question 1",
            expected_output="Create answer 1",
            contexts=["create context 1"],
            meta_data={"source": "create_test"},
        ),
    ]

    qa_catalog = await create_qa_catalog(test_session, qa_pairs, "create_test_catalog")

    result = (
        await test_session.scalars(
            select(QACatalog).where(
                cast(ColumnElement[bool], QACatalog.id == qa_catalog.id)
            )
        )
    ).one_or_none()

    assert qa_catalog.qa_catalog_group.name == "create_test_catalog"
    assert result is not None
    assert result.revision == 1
    assert result.qa_catalog_group is not None
    assert result.qa_catalog_group.name == "create_test_catalog"

    qa_pair_result = (
        await test_session.scalars(
            select(QAPair).where(
                cast(ColumnElement[bool], QAPair.qa_catalog_id == qa_catalog.id)
            )
        )
    ).all()

    assert len(qa_pair_result) == 1

    qa_pair = qa_pair_result[0]
    assert qa_pair.id == "qa_create_1"
    assert qa_pair.question == "Create question 1"
    assert qa_pair.expected_output == "Create answer 1"
    assert qa_pair.contexts == ["create context 1"]
    assert qa_pair.meta_data == {"source": "create_test"}
