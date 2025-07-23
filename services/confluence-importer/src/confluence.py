from atlassian import Confluence
import os

confluence = Confluence(
    url=os.environ.get("CONFLUENCE_URL"),
    token=os.environ.get("CONFLUENCE_TOKEN")
)


def get_page(page_id: int) -> str:
    """
    Retrieves the content of a Confluence page by its ID.
    
    Args:
        page_id: The ID of the Confluence page to retrieve
        
    Returns:
        The page content as HTML
    """
    page = confluence.get_page_by_id(page_id, expand="body.storage")
    return page.get("body").get("storage").get("value")


def get_pages_for_space(space_key: str) -> list[dict]:
    """
    Retrieves all pages from a specified Confluence space.

    Args:
        space_key: The key identifier of the Confluence space to retrieve pages from

    Returns:
        A list of dictionaries containing page information
    """
    crawling_done = False
    batch_size = 100
    offset = 0

    pages = []

    while not crawling_done:
        print(f"Fetching pages from offset {offset} with limit {batch_size}")

        # It seems that limit is broken in `atlassian-python-api`. It always defaults to 100? TODO figure out whats up.
        result = confluence.get_all_pages_from_space(space_key, start=offset, limit=batch_size, content_type="page",
                                                     expand="body.storage", status="current")
        print(f"Found {len(result)} pages in space '{space_key}'")

        pages.extend({"id": r.get('id'), "html": r.get('body').get('storage').get('value')} for r in result)

        if len(result) < batch_size:
            crawling_done = True
        else:
            offset += batch_size

    return pages
