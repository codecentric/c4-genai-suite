"""Tests for the HTML to Markdown conversion functionality."""

import pytest

from confluence_importer.confluence import ConfluencePage
from confluence_importer.markdown import html_to_markdown


@pytest.fixture
def sample_confluence_page() -> ConfluencePage:
    """Fixture that returns a sample ConfluencePage object for testing."""
    return ConfluencePage(
        id=12345,
        last_updated="2025-07-29T13:56:00.000Z",
        url="https://confluence.example.com/pages/viewpage.action?pageId=12345",
        html_content="<h1>Test Page</h1>",
        title="Test Page",
    )


class TestHtmlToMarkdown:
    """Tests for the HTML to Markdown conversion functionality."""

    def test_conversion(self, sample_confluence_page: ConfluencePage) -> None:
        """Test that html_to_markdown correctly converts HTML to Markdown with frontmatter.

        Args:
            sample_confluence_page: Fixture providing a sample ConfluencePage
        """
        # act
        result = html_to_markdown(sample_confluence_page)

        # assert
        assert (
            result
            == """---
link: https://confluence.example.com/pages/viewpage.action?pageId=12345
lastUpdated: 2025-07-29T13:56:00.000Z
title: Test Page
---
# Test Page"""
        )
