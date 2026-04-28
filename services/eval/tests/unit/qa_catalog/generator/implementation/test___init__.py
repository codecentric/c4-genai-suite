from typing import get_args
from unittest.mock import MagicMock, patch

import pytest

from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    RagasGeneratorType,
    get_catalog_generator_class,
)


def make_mock(generator_type: str) -> MagicMock:
    m = MagicMock()
    m.generator_type = generator_type
    return m


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes.active_generator_types",
    new=[get_args(RagasGeneratorType)[0]],
)
async def test_get_qa_catalog_generator_class_correctly() -> None:
    generator: MagicMock = get_catalog_generator_class(get_args(RagasGeneratorType)[0])  # type: ignore
    assert generator.generator_type == get_args(RagasGeneratorType)[0]


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes.active_generator_types",
    new=[],
)
async def test_get_qa_catalog_generator_class_incorrect() -> None:
    with pytest.raises(ValueError):
        get_catalog_generator_class("4")
