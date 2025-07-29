from io import BytesIO

from markitdown import MarkItDown

from confluence_importer.confluence import ConfluencePage

# Initialize MarkItDown
md = MarkItDown(enable_plugins=False)


def html_to_markdown(page: ConfluencePage) -> str:
    """
    Converts HTML content of a ConfluencePage to Markdown.

    Args:
        page: The ConfluencePage content to convert

    Returns:
        The converted Markdown content
    """
    frontmatter = f"""---
url: {page.url}
lastUpdated: {page.last_updated}
---
"""
    buffer = BytesIO(page.html_content.encode("utf-8"))

    html_as_markdown = md.convert(buffer).text_content

    return f"{frontmatter}{html_as_markdown}"
