"""Tests for the C4 API interaction functionality."""

from pytest_mock import MockerFixture

from confluence_importer.c4 import (
    clear_previous_ingests,
    delete_confluence_page,
    fetch_bucket_files_list,
    import_confluence_page,
)


class TestC4:
    """Tests for the c4 module functionality."""

    def test_delete_confluence_page(self, mocker: MockerFixture) -> None:
        """Test that delete_confluence_page correctly calls the C4 API.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_requests = mocker.patch("confluence_importer.c4.requests")
        mocker.patch("confluence_importer.c4.c4_base_url", "http://test-url")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")
        mocker.patch("confluence_importer.c4.config.c4_token", "test-token")
        file_id = "test-file-id"

        # act
        delete_confluence_page(file_id)

        # assert
        mock_requests.delete.assert_called_once_with(
            "http://test-url/api/buckets/test-bucket/files/test-file-id", headers={"x-api-key": "test-token"}
        )

    def test_fetch_bucket_files_list_single_page(self, mocker: MockerFixture):
        """Test that fetch_bucket_files_list correctly handles a single page of results.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_requests = mocker.patch("confluence_importer.c4.requests")
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.c4_base_url", "http://test-url")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")
        mocker.patch("confluence_importer.c4.config.c4_token", "test-token")

        mock_response = mocker.MagicMock()
        mock_response.json.return_value = {
            "total": 2,
            "items": [
                {"id": "file1", "fileName": "confluence_page_1.md"},
                {"id": "file2", "fileName": "confluence_page_2.md"},
            ],
        }
        mock_requests.get.return_value = mock_response

        # act
        result = fetch_bucket_files_list()

        # assert
        mock_requests.get.assert_called_once_with(
            "http://test-url/api/buckets/test-bucket/files", headers={"x-api-key": "test-token"}
        )
        assert len(result) == 2
        assert result[0]["id"] == "file1"
        assert result[1]["id"] == "file2"
        mock_logger.info.assert_called_once()

    def test_fetch_bucket_files_list_multiple_pages(self, mocker: MockerFixture):
        """Test that fetch_bucket_files_list correctly handles multiple pages of results.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_requests = mocker.patch("confluence_importer.c4.requests")
        mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.c4_base_url", "http://test-url")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")
        mocker.patch("confluence_importer.c4.config.c4_token", "test-token")

        first_response = mocker.MagicMock()
        first_response.json.return_value = {
            "total": 3,
            "items": [
                {"id": "file1", "fileName": "confluence_page_1.md"},
                {"id": "file2", "fileName": "confluence_page_2.md"},
            ],
        }

        second_response = mocker.MagicMock()
        second_response.json.return_value = {"total": 3, "items": [{"id": "file3", "fileName": "confluence_page_3.md"}]}

        mock_requests.get.return_value = first_response

        # act
        result = fetch_bucket_files_list()

        # assert
        mock_requests.get.assert_called_once_with(
            "http://test-url/api/buckets/test-bucket/files", headers={"x-api-key": "test-token"}
        )
        assert len(result) == 2
        assert result[0]["id"] == "file1"
        assert result[1]["id"] == "file2"

    def test_import_confluence_page_success(self, mocker: MockerFixture):
        """Test that import_confluence_page correctly handles successful API responses.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_requests = mocker.patch("confluence_importer.c4.requests")
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.c4_base_url", "http://test-url")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")
        mocker.patch("confluence_importer.c4.config.c4_token", "test-token")

        page_id = 12345
        page_markdown = "# Test Page"

        mock_response = mocker.MagicMock()
        mock_response.status_code = 201
        mock_requests.post.return_value = mock_response

        # act
        import_confluence_page(page_id, page_markdown)

        # assert
        mock_requests.post.assert_called_once_with(
            "http://test-url/api/buckets/test-bucket/files",
            files={"file": (f"confluence_page_{page_id}.md", page_markdown, "text/markdown")},
            headers={"x-api-key": "test-token"},
        )

        mock_logger.debug.assert_called_once()
        mock_logger.error.assert_not_called()

    def test_import_confluence_page_error(self, mocker: MockerFixture):
        """Test that import_confluence_page correctly handles error API responses.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_requests = mocker.patch("confluence_importer.c4.requests")
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.c4_base_url", "http://test-url")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")
        mocker.patch("confluence_importer.c4.config.c4_token", "test-token")

        page_id = 12345
        page_markdown = "# Test Page"

        mock_response = mocker.MagicMock()
        mock_response.status_code = 500
        mock_response.text = "Internal Server Error"
        mock_requests.post.return_value = mock_response

        # act
        import_confluence_page(page_id, page_markdown)

        # assert
        mock_requests.post.assert_called_once_with(
            "http://test-url/api/buckets/test-bucket/files",
            files={"file": (f"confluence_page_{page_id}.md", page_markdown, "text/markdown")},
            headers={"x-api-key": "test-token"},
        )
        mock_logger.debug.assert_not_called()
        mock_logger.error.assert_called_once()

    def test_clear_previous_ingests(self, mocker: MockerFixture):
        """Test that clear_previous_ingests correctly deletes Confluence pages from C4.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_fetch_bucket_files = mocker.patch(
            "confluence_importer.c4.fetch_bucket_files_list",
            return_value=[
                {"id": "file1", "fileName": "confluence_page_1.md"},
                {"id": "file2", "fileName": "other_file.txt"},
                {"id": "file3", "fileName": "confluence_page_2.md"},
            ],
        )
        mock_delete_confluence_page = mocker.patch("confluence_importer.c4.delete_confluence_page")
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")

        # act
        clear_previous_ingests()

        # assert
        mock_fetch_bucket_files.assert_called_once()
        assert mock_delete_confluence_page.call_count == 2
        mock_delete_confluence_page.assert_any_call("file1")
        mock_delete_confluence_page.assert_any_call("file3")
        mock_logger.info.assert_called()

    def test_clear_previous_ingests_with_empty_list(self, mocker: MockerFixture):
        """Test that clear_previous_ingests works correctly with empty bucket files list.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_fetch_bucket_files = mocker.patch(
            "confluence_importer.c4.fetch_bucket_files_list",
            return_value=[]
        )
        mock_delete_confluence_page = mocker.patch("confluence_importer.c4.delete_confluence_page")
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")

        # act
        clear_previous_ingests()

        # assert
        mock_fetch_bucket_files.assert_called_once()
        mock_delete_confluence_page.assert_not_called()
        mock_logger.info.assert_called()

    def test_clear_previous_ingests_with_error(self, mocker: MockerFixture):
        """Test that clear_previous_ingests correctly handles errors during deletion.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        mock_fetch_bucket_files = mocker.patch(
            "confluence_importer.c4.fetch_bucket_files_list",
            return_value=[
                {"id": "file1", "fileName": "confluence_page_1.md"},
                {"id": "file2", "fileName": "confluence_page_2.md"},
            ],
        )

        def delete_side_effect(file_id):
            if file_id == "file2":
                raise Exception("Delete failed")

        mock_delete_confluence_page = mocker.patch(
            "confluence_importer.c4.delete_confluence_page", side_effect=delete_side_effect
        )
        mock_logger = mocker.patch("confluence_importer.c4.logger")
        mocker.patch("confluence_importer.c4.bucket_id", "test-bucket")

        # act
        clear_previous_ingests()

        # assert
        mock_fetch_bucket_files.assert_called_once()
        assert mock_delete_confluence_page.call_count == 2
        mock_logger.error.assert_called()
