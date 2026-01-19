from datetime import datetime
from unittest.mock import ANY, MagicMock, patch

import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from llm_eval.database.model import QACatalogStatus
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    _create_qa_catalog_entity,  # type: ignore
    _create_qa_catalog_group_entity,  # type: ignore
)
from llm_eval.qa_catalog.models import (
    DownloadQACatalogResponse,
    QACatalog,
    QACatalogPreview,
    QACatalogVersionHistory,
    QACatalogVersionHistoryItem,
)
from llm_eval.qa_catalog.router import router


class TestQACatalogRouter:
    client: TestClient

    def setup_class(self) -> None:
        self.client = TestClient(router)

    def teardown_class(self) -> None:
        self.client.close()

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.find_qa_catalog_previews")
    async def test_get(self, mock_find_catalog_previews: MagicMock) -> None:
        preview1 = QACatalogPreview(
            id="123",
            name="test",
            length=2,
            revision=3,
            created_at=datetime.fromisoformat("1970-01-01T05:36:45Z"),
            updated_at=datetime.fromisoformat("1970-01-01T06:27:14Z"),
            status=QACatalogStatus.READY,
        )

        preview2 = QACatalogPreview(
            id="1234",
            name="test2",
            length=5,
            revision=1,
            created_at=datetime.fromisoformat("1970-01-01T05:36:45Z"),
            updated_at=datetime.fromisoformat("1970-01-01T06:27:14Z"),
            status=QACatalogStatus.FAILURE,
        )

        mock_find_catalog_previews.return_value = [preview1, preview2]

        response = self.client.get("qa-catalog/")
        assert response.status_code == 200

        assert response.json() == [
            {
                "id": "123",
                "name": "test",
                "length": 2,
                "revision": 3,
                "createdAt": "1970-01-01T05:36:45Z",
                "updatedAt": "1970-01-01T06:27:14Z",
                "status": "READY",
            },
            {
                "id": "1234",
                "name": "test2",
                "length": 5,
                "revision": 1,
                "createdAt": "1970-01-01T05:36:45Z",
                "updatedAt": "1970-01-01T06:27:14Z",
                "status": "FAILURE",
            },
        ]

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.logic.crud_qa_catalog_from_file._parse_file")
    @patch("llm_eval.qa_catalog.logic.crud_qa_catalog_from_file.insert_qa_catalog")
    async def test_post_valid(
        self, mock_insert: MagicMock, mock_file_parser: MagicMock
    ) -> None:
        mock_file_parser.return_value = [
            {
                "question": "foo",
                "expected_output": "bar",
                "contexts": "con",
                "meta_data": "met",
            }
        ]

        mock_result = _create_qa_catalog_entity(
            _create_qa_catalog_group_entity(name="test123"), []
        )

        mock_result.id = "123"
        mock_result.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")

        mock_result.status = QACatalogStatus.READY

        mock_insert.return_value = mock_result

        file_content = b"placeholder"
        file_to_upload = ("testfile.csv", file_content)

        response = self.client.post(
            "/qa-catalog/upload",
            files={"file": file_to_upload},
            data={"name": "test123"},
        )

        assert response.status_code == 201

        assert response.json() == {
            "id": "123",
            "name": "test123",
            "revision": 1,
            "createdAt": "2019-01-04T16:41:24+02:00",
            "updatedAt": "2019-01-04T16:41:24+02:00",
            "status": "READY",
            "error": None,
        }

    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    def test_get_catalog(self, mock_find_qa_catalog: MagicMock) -> None:
        mock_result = _create_qa_catalog_entity(
            _create_qa_catalog_group_entity(name="test123"), []
        )
        mock_result.id = "123"
        mock_result.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.status = QACatalogStatus.READY

        mock_find_qa_catalog.return_value = mock_result

        response = self.client.get("/qa-catalog/123")

        assert response.status_code == 200

        assert response.json() == {
            "id": "123",
            "name": "test123",
            "revision": 1,
            "createdAt": "2019-01-04T16:41:24+02:00",
            "updatedAt": "2019-01-04T16:41:24+02:00",
            "status": "READY",
            "error": None,
        }

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.logic.crud_qa_catalog_from_file._parse_file")
    @patch("llm_eval.qa_catalog.logic.crud_qa_catalog_from_file.update_qa_catalog")
    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    async def test_update_catalog(
        self, mock_find: MagicMock, mock_update: MagicMock, mock_file_parser: MagicMock
    ) -> None:
        mock_file_parser.return_value = [
            {
                "question": "foo",
                "expected_output": "bar",
                "contexts": "con",
                "meta_data": "met",
            }
        ]

        mock_result = _create_qa_catalog_entity(
            _create_qa_catalog_group_entity(name="test123"), []
        )

        mock_result.id = "123"
        mock_result.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")

        mock_result.status = QACatalogStatus.READY

        mock_update.return_value = mock_result

        mock_result.updated_at = datetime.fromisoformat("2019-01-04T18:41:24+02:00")
        mock_result.id = "new_id"
        mock_result.revision = 2
        mock_find.return_value = mock_result

        file_content = b"placeholder"
        file_to_upload = ("testfile.csv", file_content)

        response = self.client.put(
            "/qa-catalog/123/upload",
            files={"file": file_to_upload},
            data={"name": "test123"},
        )

        assert response.status_code == 201

        assert response.json() == {
            "id": "new_id",
            "name": "test123",
            "revision": 2,
            "createdAt": "2019-01-04T16:41:24+02:00",
            "updatedAt": "2019-01-04T18:41:24+02:00",
            "status": "READY",
            "error": None,
        }

    @patch("llm_eval.qa_catalog.router.find_qa_catalog_with_latest_revision")
    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    @patch("llm_eval.qa_catalog.router.delete_qa_catalog")
    def test_delete_catalog_no_latest_revision(
        self,
        mock_delete_qa_catalog: MagicMock,
        mock_find_qa_catalog: MagicMock,
        mock_find_previous_qa_catalog: MagicMock,
    ) -> None:
        mock_result = _create_qa_catalog_entity(
            _create_qa_catalog_group_entity(name="test123"), []
        )
        mock_result.id = "123"
        mock_result.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.status = QACatalogStatus.READY

        mock_find_qa_catalog.return_value = mock_result
        mock_find_previous_qa_catalog.return_value = None

        response = self.client.delete("/qa-catalog/123")

        assert response.status_code == 200
        assert response.json() == {"previousRevisionId": None}

    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    @patch("llm_eval.qa_catalog.router.delete_qa_catalog")
    @patch("llm_eval.qa_catalog.router.find_qa_catalog_with_latest_revision")
    def test_delete_catalog_has_latest_revision(
        self,
        mock_find_latest: MagicMock,
        mock_delete_qa_catalog: MagicMock,
        mock_find_qa_catalog: MagicMock,
    ) -> None:
        group = _create_qa_catalog_group_entity(name="test123")
        mock_result = _create_qa_catalog_entity(group, [])
        mock_result.id = "123"
        mock_result.revision = 3
        mock_result.created_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2019-01-04T16:41:24+02:00")
        mock_result.status = QACatalogStatus.READY

        mock_find_qa_catalog.return_value = mock_result

        mock_result_latest = _create_qa_catalog_entity(group, [])
        mock_result_latest.id = "123"
        mock_result_latest.revision = 2
        mock_result_latest.created_at = datetime.fromisoformat(
            "2019-01-04T16:41:24+02:00"
        )
        mock_result_latest.updated_at = datetime.fromisoformat(
            "2019-01-04T16:41:24+02:00"
        )
        mock_result_latest.status = QACatalogStatus.READY

        mock_find_latest.return_value = mock_result_latest

        response = self.client.delete("/qa-catalog/123")

        mock_find_qa_catalog.assert_called_with(ANY, "123")
        mock_delete_qa_catalog.assert_called_with(ANY, mock_result)
        mock_find_latest.assert_called_with(ANY, mock_result.qa_catalog_group_id)

        assert response.status_code == 200
        assert response.json() == {"previousRevisionId": mock_result_latest.id}

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.submit_generate_catalog_task")
    @patch("llm_eval.qa_catalog.router.create_qa_catalog")
    async def test_generate(
        self,
        mock_create_qa_catalog: MagicMock,
        mock_submit_generate_catalog_task: MagicMock,
    ) -> None:
        group = _create_qa_catalog_group_entity(name="test1234")
        mock_result = _create_qa_catalog_entity(group, [])
        mock_result.id = "1234"
        mock_result.revision = 5
        mock_result.created_at = datetime.fromisoformat("2025-04-14T16:41:24+02:00")
        mock_result.updated_at = datetime.fromisoformat("2025-04-14T16:41:24+02:00")
        mock_result.status = QACatalogStatus.READY

        mock_create_qa_catalog.return_value = mock_result
        mock_submit_generate_catalog_task.return_value = None

        response = self.client.post(
            "/qa-catalog/generator/catalog",
            json={
                "type": "RAGAS",
                "name": "Ragas-Test-1",
                "config": {
                    "type": "RAGAS",
                    "knowledge_graph_location": "/tmp/somefile.pdf",
                    "sample_count": 5,
                    "query_distribution": [
                        "SINGLE_HOP_SPECIFIC",
                    ],
                    "personas": [
                        {"name": "person1", "description": "Beschreibung Persona 1"}
                    ],
                },
                "data_source_config_id": "config_id",
                "modelConfigSchema": {
                    "type": "RAGAS",
                    "llm_endpoint": "https://localhost:12345/noop",
                },
            },
        )

        assert response.status_code == 201
        assert response.json() == {"catalogId": "1234"}

    @pytest.mark.asyncio
    async def test_get_generator_types(self) -> None:
        response = self.client.get(
            url="/qa-catalog/generator/types",
        )

        assert response.status_code == 200
        assert response.json() == [{"type": "RAGAS"}]

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.handle_catalog_download")
    async def test_download_ok(self, mock_handle_catalog_download: MagicMock) -> None:
        mock_handle_catalog_download.return_value = DownloadQACatalogResponse(
            download_url="Base64DownloadURL", filename="filename"
        )

        response = self.client.post(
            url="/qa-catalog/download",
            json={
                "format": "csv",
                "parent_catalog_id": "1.0",
                "version_ids": ["1.0"],
                "include_all": "false",
            },
        )

        assert response.status_code == 200
        assert response.json() == {
            "downloadUrl": "Base64DownloadURL",
            "filename": "filename",
        }

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.handle_catalog_download")
    async def test_download_not_found(
        self, mock_handle_catalog_download: MagicMock
    ) -> None:
        mock_handle_catalog_download.return_value = None

        with pytest.raises(HTTPException) as context:
            self.client.post(
                url="/qa-catalog/download",
                json={
                    "format": "csv",
                    "parent_catalog_id": "1.0",
                    "version_ids": ["1.0"],
                    "include_all": "false",
                },
            )
        assert context.value.status_code == 404

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.create_qa_catalog_revision_history")
    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    async def test_get_history_ok(
        self,
        mock_find_qa_catalog: MagicMock,
        mock_create_qa_catalog_revision_history: MagicMock,
    ) -> None:
        mock_find_qa_catalog.return_value = QACatalog(
            id="123",
            name="test123",
            revision=3,
            createdAt=datetime.fromisoformat("1970-01-01T01:00:00+00:00"),
            updatedAt=datetime.fromisoformat("1970-01-01T01:00:00+00:00"),
            status=QACatalogStatus.READY,
            error=None,
        )
        mock_create_qa_catalog_revision_history.return_value = QACatalogVersionHistory(
            versions=[
                QACatalogVersionHistoryItem(
                    version_id="123",
                    created_at=datetime.fromisoformat("1970-01-01T00:30:00+00:00"),
                    revision=2,
                ),
                QACatalogVersionHistoryItem(
                    version_id="123",
                    created_at=datetime.fromisoformat("1970-01-01T00:00:00+00:00"),
                    revision=1,
                ),
            ]
        )

        response = self.client.get(
            url="/qa-catalog/123/history",
        )

        assert response.status_code == 200
        assert response.json() == {
            "versions": [
                {
                    "versionId": "123",
                    "createdAt": "1970-01-01T00:30:00Z",
                    "revision": 2,
                },
                {
                    "versionId": "123",
                    "createdAt": "1970-01-01T00:00:00Z",
                    "revision": 1,
                },
            ]
        }

    @pytest.mark.asyncio
    @patch("llm_eval.qa_catalog.router.create_qa_catalog_revision_history")
    @patch("llm_eval.qa_catalog.router.find_qa_catalog")
    async def test_get_history_not_found(
        self,
        mock_find_qa_catalog: MagicMock,
        mock_create_qa_catalog_revision_history: MagicMock,
    ) -> None:
        mock_find_qa_catalog.return_value = None
        mock_create_qa_catalog_revision_history.return_value = None

        with pytest.raises(HTTPException) as context:
            self.client.get(
                url="/qa-catalog/123/history",
            )

        assert context.value.status_code == 404
