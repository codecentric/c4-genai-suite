import pytest
from pytest_mock import MockerFixture

from confluence_importer.confluence import ConfluencePage
from confluence_importer.markdown import html_to_markdown


@pytest.fixture
def sample_confluence_page():
    """Fixture that returns a sample ConfluencePage object for testing."""
    return ConfluencePage(
        id=12345,
        last_updated="2025-07-29T13:56:00.000Z",
        url="https://confluence.example.com/pages/viewpage.action?pageId=12345",
        html_content="<h1>Test Page</h1>",
    )


class MockDocumentConverterResult:
    def __init__(self, text_content):
        self.text_content = text_content


class TestHtmlToMarkdown:
    def test_conversion(self, sample_confluence_page, mocker: MockerFixture):
        # arrange
        mock_convert = mocker.patch(
            "confluence_importer.markdown.md.convert", return_value=MockDocumentConverterResult("# Test Page")
        )

        # act
        result = html_to_markdown(sample_confluence_page)

        # assert
        mock_convert.assert_called_once()

        assert (
            result
            == """---
url: https://confluence.example.com/pages/viewpage.action?pageId=12345
lastUpdated: 2025-07-29T13:56:00.000Z
---
# Test Page"""
        )
