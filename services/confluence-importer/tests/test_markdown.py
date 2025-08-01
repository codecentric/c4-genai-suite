"""Tests for the HTML to Markdown conversion functionality."""

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
    """Mock class for MarkItDown conversion result."""

    def __init__(self, text_content):
        """Initialize the mock converter result.

        Args:
            text_content: The text content to be returned by the mock
        """
        self.text_content = text_content


class TestHtmlToMarkdown:
    """Tests for the HTML to Markdown conversion functionality."""

    def test_conversion(self, sample_confluence_page, mocker: MockerFixture):
        """Test that html_to_markdown correctly converts HTML to Markdown with frontmatter.

        Args:
            sample_confluence_page: Fixture providing a sample ConfluencePage
            mocker: Pytest fixture for mocking
        """
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
