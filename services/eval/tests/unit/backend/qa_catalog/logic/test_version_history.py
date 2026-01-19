from datetime import datetime
from unittest.mock import MagicMock, patch

import pytest

from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)
from llm_eval.qa_catalog.logic.revision_history import (
    create_qa_catalog_revision_history,
)
from llm_eval.qa_catalog.models import (
    QACatalogVersionHistory,
    QACatalogVersionHistoryItem,
)


class TestVersionHistory:
    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.logic.revision_history.find_qa_catalogs_by_group")
    async def test_no_history(self, mock_find_by_group: MagicMock) -> None:
        qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
        qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
        qa_catalog_1.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")

        mock_find_by_group.return_value = [qa_catalog_1]

        result = await create_qa_catalog_revision_history(None, qa_catalog_1)  # type: ignore

        expected = QACatalogVersionHistory(
            versions=[
                QACatalogVersionHistoryItem(
                    version_id=qa_catalog_1.id,
                    created_at=qa_catalog_1.created_at,
                    revision=1,
                )
            ]
        )

        assert result == expected

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.logic.revision_history.find_qa_catalogs_by_group")
    async def test_has_history(self, mock_get_by_group: MagicMock) -> None:
        qa_catalog_group1 = _create_qa_catalog_group_entity(name="test1")
        qa_catalog_1 = _create_qa_catalog_entity(qa_catalog_group1, [])
        qa_catalog_1.id = "id1"
        qa_catalog_1.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        qa_catalog_1.revision = 1

        qa_catalog_2 = _create_qa_catalog_entity(qa_catalog_group1, [])
        qa_catalog_2.created_at = datetime.fromisoformat("2019-02-04T16:41:24+02:00")
        qa_catalog_2.id = "id2"
        qa_catalog_2.revision = 2

        qa_catalog_3 = _create_qa_catalog_entity(qa_catalog_group1, [])
        qa_catalog_3.id = "id3"
        qa_catalog_3.created_at = datetime.fromisoformat("2019-03-04T16:41:24+02:00")
        qa_catalog_3.revision = 3

        qa_catalog_group2 = _create_qa_catalog_group_entity(name="test2")
        qa_catalog_4 = _create_qa_catalog_entity(qa_catalog_group2, [])
        qa_catalog_4.id = "id4"
        qa_catalog_4.created_at = datetime.fromisoformat("2019-03-04T16:41:24+02:00")
        qa_catalog_4.revision = 4

        mock_get_by_group.return_value = [qa_catalog_1, qa_catalog_2, qa_catalog_3]

        result = await create_qa_catalog_revision_history(None, qa_catalog_3)  # type: ignore

        assert len(result.versions) == 3
        expected = QACatalogVersionHistory(
            versions=[
                QACatalogVersionHistoryItem(
                    version_id=qa_catalog_3.id,
                    created_at=qa_catalog_3.created_at,
                    revision=qa_catalog_3.revision,
                ),
                QACatalogVersionHistoryItem(
                    version_id=qa_catalog_2.id,
                    created_at=qa_catalog_2.created_at,
                    revision=qa_catalog_2.revision,
                ),
                QACatalogVersionHistoryItem(
                    version_id=qa_catalog_1.id,
                    created_at=qa_catalog_1.created_at,
                    revision=qa_catalog_1.revision,
                ),
            ]
        )

        assert result == expected
