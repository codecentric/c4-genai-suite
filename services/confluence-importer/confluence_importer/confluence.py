"""Module for interacting with the Confluence API to retrieve content."""

from typing import Generator

from atlassian import Confluence
from dataclasses import dataclass

from confluence_importer.logger import logger
from confluence_importer.config import config

confluence_url = config.confluence_url

confluence_api = Confluence(url=confluence_url, token=config.confluence_token)  # type: ignore[no-untyped-call]


@dataclass
class ConfluencePage:
    """Data class representing a Confluence page with its content and metadata."""

    id: int
    last_updated: str
    url: str
    html_content: str
    title: str


def get_page(page_id: int) -> ConfluencePage:
    """Retrieves the content of a Confluence page by its ID.

    Args:
        page_id: The ID of the Confluence page to retrieve

    Returns:
        A ConfluencePage dataclass containing the page information and content as HTML
    """
    page = confluence_api.get_page_by_id(page_id, expand="body.storage,history.lastUpdated")  # type: ignore[no-untyped-call]

    return ConfluencePage(
        page_id,
        page.get("history").get("lastUpdated").get("when"),
        f"{confluence_url}{page.get('_links').get('webui')}",
        page.get("body").get("storage").get("value"),
        title=page.get("title"),
    )


def get_pages_for_space(space_key: str) -> Generator[ConfluencePage]:
    """Retrieves all pages from a specified Confluence space.

    Args:
        space_key: The key identifier of the Confluence space to retrieve pages from

    Returns:
        A list of ConfluencePage dataclasses containing the page information and content as HTML
    """
    crawling_done = False
    batch_size = 100  # Don't change. See comment regarding `get_all_pages_from_space_as_generator()` below.
    offset = 0

    while not crawling_done:
        logger.debug("Fetch Pages for Confluence Space", space_key=space_key, offset=offset, limit=batch_size)

        # It seems that the `limit` parameter is broken and is always 100.
        # This is fine as long as we keep our `batch_size` at 100.
        result = confluence_api.get_all_pages_from_space_as_generator(
            space_key,
            start=offset,
            limit=batch_size,
            content_type="page",
            expand="body.storage,history.lastUpdated",
            status="current",
        )  # type: ignore[no-untyped-call]

        len_result = 0
        for r in result:
            len_result += 1
            yield ConfluencePage(
                r.get("id"),
                r.get("history").get("lastUpdated").get("when"),
                f"{confluence_url}{r.get('_links').get('webui')}",
                r.get("body").get("storage").get("value"),
                r.get("title"),
            )

        if len_result < batch_size:
            crawling_done = True
        else:
            offset += batch_size

    logger.info("All Pages for Confluence Space fetched", space_key=space_key)
