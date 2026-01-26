"""Module for converting HTML content to Markdown format."""

import yaml
from markdownify import markdownify

from confluence_importer.confluence import ConfluencePage


def html_to_markdown(page: ConfluencePage) -> str:
    """Converts HTML content of a ConfluencePage to Markdown.

    Args:
        page: The ConfluencePage content to convert

    Returns:
        The converted Markdown content
    """
    frontmatter_data = {
        "link": page.url,
        "lastUpdated": page.last_updated,
        "title": page.title,
    }
    frontmatter_yaml = yaml.safe_dump(frontmatter_data, allow_unicode=True, default_flow_style=False, sort_keys=False)
    frontmatter = f"---\n{frontmatter_yaml}---\n"

    html_as_markdown = markdownify(page.html_content, heading_style="ATX", strip=["script", "style"])

    return f"{frontmatter}{html_as_markdown}"
