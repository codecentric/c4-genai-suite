"""Tests for the Confluence API interaction functionality."""

from pytest_mock import MockerFixture

from confluence_importer.confluence import get_page, get_pages_for_space, ConfluencePage, confluence_url


class TestConfluence:
    """Tests for the Confluence module functionality."""

    def test_get_page(self, mocker: MockerFixture) -> None:
        """Test that get_page correctly retrieves and parses a Confluence page.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        page_id = 123456
        mock_page_data = {
            "body": {"storage": {"value": "<h1>Test Page</h1>"}},
            "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
            "_links": {"webui": "/rest/api/content/123456"},
            "title": "Test Page",
        }

        mock_get_page_by_id = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_page_by_id",
            return_value=mock_page_data,
        )

        # act
        result = get_page(page_id)

        # assert
        mock_get_page_by_id.assert_called_once_with(page_id, expand="body.storage,history.lastUpdated")
        assert isinstance(result, ConfluencePage)
        assert result.id == page_id
        assert result.last_updated == "2025-07-29T13:56:00.000Z"
        assert result.url == f"{confluence_url}/rest/api/content/123456"
        assert result.html_content == "<h1>Test Page</h1>"
        assert result.title == "Test Page"

    def test_get_pages_for_space(self, mocker: MockerFixture) -> None:
        """Test that get_pages_for_space correctly retrieves and parses pages from a Confluence space.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        space_key = "TEST"
        mock_pages = [
            {
                "id": 123456,
                "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
                "_links": {"webui": "/rest/api/content/123456"},
                "body": {"storage": {"value": "<h1>Test Page 1</h1>"}},
                "title": "Test Page 1",
            },
            {
                "id": 789012,
                "history": {"lastUpdated": {"when": "2025-07-30T10:15:00.000Z"}},
                "_links": {"webui": "/rest/api/content/789012"},
                "body": {"storage": {"value": "<h1>Test Page 2</h1>"}},
                "title": "Test Page 2",
            },
        ]

        mock_generator = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_all_pages_from_space_as_generator",
            return_value=mock_pages,
        )

        mocker.patch("confluence_importer.confluence.logger.debug")
        mocker.patch("confluence_importer.confluence.logger.info")

        # act
        results = list(get_pages_for_space(space_key))

        # assert
        mock_generator.assert_called_once_with(
            space_key,
            start=0,
            limit=100,
            content_type="page",
            expand="body.storage,history.lastUpdated",
            status="current",
        )

        assert len(results) == 2

        assert isinstance(results[0], ConfluencePage)
        assert results[0].id == 123456
        assert results[0].last_updated == "2025-07-29T13:56:00.000Z"
        assert results[0].url == f"{confluence_url}/rest/api/content/123456"
        assert results[0].html_content == "<h1>Test Page 1</h1>"
        assert results[0].title == "Test Page 1"

        assert isinstance(results[1], ConfluencePage)
        assert results[1].id == 789012
        assert results[1].last_updated == "2025-07-30T10:15:00.000Z"
        assert results[1].url == f"{confluence_url}/rest/api/content/789012"
        assert results[1].html_content == "<h1>Test Page 2</h1>"
        assert results[1].title == "Test Page 2"

    def test_get_pages_for_space_pagination(self, mocker: MockerFixture) -> None:
        """Test that get_pages_for_space correctly handles pagination of results.

        Args:
            mocker: Pytest fixture for mocking
        """
        # arrange
        space_key = "TEST"

        first_batch = [
            {
                "id": i,
                "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
                "_links": {"webui": f"/rest/api/content/{i}"},
                "body": {"storage": {"value": f"<h1>Page {i}</h1>"}},
                "title": f"Page {i}",
            }
            for i in range(100)
        ]

        second_batch = [
            {
                "id": i + 100,
                "history": {"lastUpdated": {"when": "2025-07-30T10:15:00.000Z"}},
                "_links": {"webui": f"/rest/api/content/{i + 100}"},
                "body": {"storage": {"value": f"<h1>Page {i + 100}</h1>"}},
                "title": f"Page {i + 100}",
            }
            for i in range(50)
        ]

        mock_generator = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_all_pages_from_space_as_generator",
            side_effect=[first_batch, second_batch],
        )

        mocker.patch("confluence_importer.confluence.logger.debug")
        mocker.patch("confluence_importer.confluence.logger.info")

        # act
        results = list(get_pages_for_space(space_key))

        # assert
        assert mock_generator.call_count == 2
        assert mock_generator.call_args_list[0][0] == (space_key,)
        assert mock_generator.call_args_list[0][1] == {
            "start": 0,
            "limit": 100,
            "content_type": "page",
            "expand": "body.storage,history.lastUpdated",
            "status": "current",
        }

        assert mock_generator.call_args_list[1][0] == (space_key,)
        assert mock_generator.call_args_list[1][1] == {
            "start": 100,
            "limit": 100,
            "content_type": "page",
            "expand": "body.storage,history.lastUpdated",
            "status": "current",
        }

        assert len(results) == 150
        assert results[0].id == 0
        assert results[99].id == 99
        assert results[100].id == 100
        assert results[149].id == 149
