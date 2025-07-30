import os
import tempfile
from markitdown import MarkItDown

from src.confluence import ConfluencePage

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
    # TODO check if there is a way to do this in memory
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False)
    temp_file.write(page.html_content)
    temp_file.close()

    frontmatter = f"""---
url: {page.url}
lastUpdated: {page.lastUpdated}
---
"""

    html_as_markdown = md.convert(temp_file.name).text_content
    os.unlink(temp_file.name)
    
    return f"{frontmatter}{html_as_markdown}"
