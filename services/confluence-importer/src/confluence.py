from typing import Generator

from atlassian import Confluence
from dataclasses import dataclass
import os

from src.logger import logger

confluence_url = os.environ.get("CONFLUENCE_URL")

confluence_api = Confluence(
    url=confluence_url,
    token=os.environ.get("CONFLUENCE_TOKEN")
)


@dataclass
class ConfluencePage:
    id: int
    lastUpdated: str
    url: str
    html_content: str


def get_page(page_id: int) -> ConfluencePage:
    """
    Retrieves the content of a Confluence page by its ID.
    
    Args:
        page_id: The ID of the Confluence page to retrieve
        
    Returns:
        A ConfluencePage dataclass containing the page information and content as HTML
    """
    page = confluence_api.get_page_by_id(page_id, expand="body.storage,history.lastUpdated")

    return ConfluencePage(
        page_id,
        page.get('history').get('lastUpdated').get('when'),
        f"{confluence_url}{page.get('_links').get('webui')}",
        page.get("body").get("storage").get("value")
    )


def get_pages_for_space(space_key: str) -> Generator[ConfluencePage]:
    """
    Retrieves all pages from a specified Confluence space.

    Args:
        space_key: The key identifier of the Confluence space to retrieve pages from

    Returns:
        A list of ConfluencePage dataclasses containing the page information and content as HTML
    """
    crawling_done = False
    batch_size = 100
    offset = 0

    while not crawling_done:
        logger.debug("Fetch Pages for Confluence Space", space_key=space_key, offset=offset, limit=batch_size)

        # It seems that limit is broken in `atlassian-python-api`. It always defaults to 100? TODO figure out whats up.
        result = confluence_api.get_all_pages_from_space_as_generator(space_key, start=offset, limit=batch_size, content_type="page",
                                                         expand="body.storage,history.lastUpdated", status="current")

        len_result = 0
        for r in result:
            len_result += 1
            yield ConfluencePage(
                r.get('id'),
                r.get('history').get('lastUpdated').get('when'),
                f"{confluence_url}{r.get('_links').get('webui')}",
                r.get('body').get('storage').get('value')
            )

        if len_result < batch_size:
            crawling_done = True
        else:
            offset += batch_size

    logger.info("All Pages for Confluence Space fetched", space_key=space_key)
