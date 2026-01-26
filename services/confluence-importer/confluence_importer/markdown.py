"""Module for converting HTML content to Markdown format."""

from markdownify import markdownify

from confluence_importer.confluence import ConfluencePage


def html_to_markdown(page: ConfluencePage) -> str:
    """Converts HTML content of a ConfluencePage to Markdown.

    Args:
        page: The ConfluencePage content to convert

    Returns:
        The converted Markdown content
    """
    frontmatter = f"""---
link: {page.url}
lastUpdated: {page.last_updated}
title: {page.title}
---
"""
    html_as_markdown = markdownify(page.html_content, heading_style="ATX", strip=["script", "style"])

    return f"{frontmatter}{html_as_markdown}"
