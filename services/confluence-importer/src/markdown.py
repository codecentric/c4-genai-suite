import os
import tempfile
from markitdown import MarkItDown

# Initialize MarkItDown
md = MarkItDown(enable_plugins=False)

def html_to_markdown(html: str) -> str:
    """
    Converts HTML content to Markdown.
    
    Args:
        html: The HTML content to convert
        
    Returns:
        The converted Markdown content
    """
    # TODO check if there is a way to do this in memory
    temp_file = tempfile.NamedTemporaryFile(mode='w', suffix='.html', delete=False)
    temp_file.write(html)
    temp_file.close()
    page_as_markdown = md.convert(temp_file.name)
    os.unlink(temp_file.name)
    
    return page_as_markdown.text_content
