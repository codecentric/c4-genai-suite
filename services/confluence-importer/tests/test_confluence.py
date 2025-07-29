from pytest_mock import MockerFixture

from confluence_importer.confluence import get_page


class TestConfluence:
    def test_get_page(self, mocker: MockerFixture):
        # arrange
        mock_get_page_by_id = mocker.patch(
            "confluence_importer.confluence.confluence_api.get_page_by_id",
            return_value={
                "body": {"storage": {"value": "<h1>Test Page</h1>"}},
                "history": {"lastUpdated": {"when": "2025-07-29T13:56:00.000Z"}},
                "_links": {"webui": "https://confluence.example.com/rest/api/content/123456"},
            },
        )

        # act
        get_page(123456)

        # assert
        mock_get_page_by_id.assert_called_once_with(123456, expand="body.storage,history.lastUpdated")
