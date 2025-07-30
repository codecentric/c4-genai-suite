import os

import confluence
from c4 import clear_previous_ingests, import_confluence_page
from markdown import html_to_markdown
from src.logger import logger

space_keys = os.environ.get("CONFLUENCE_SPACE_KEYS_TO_IMPORT").split(",")
page_ids = [int(page_id) for page_id in os.environ.get("CONFLUENCE_PAGE_IDS_TO_IMPORT").split(",")]


def __main__():
    logger.info("Starting synchronization Confluence to c4")
    clear_previous_ingests()

    logger.info("Starting import of Confluence Spaces", num_spaces=len(space_keys))
    for space_key in space_keys:
        logger.info("Starting import of Confluence Space", space_key=space_key)
        pages = confluence.get_pages_for_space(space_key)

        for index, page in enumerate(pages, start=1):
            page_markdown = html_to_markdown(page)
            import_confluence_page(page.id, page_markdown)
            logger.info("Import Confluence page", space_key=space_key, page_id=page.id, page_count=f"{index}")

        logger.info("Import of Confluence Space completed", space_key=space_key)
    logger.info("Import of all Confluence Spaces completed")

    num_pages = len(page_ids)
    logger.info("Starting import of individual Confluence pages", num_pages=num_pages)
    for index, page_id in enumerate(page_ids):
        page = confluence.get_page(page_id)
        page_markdown = html_to_markdown(page)
        import_confluence_page(page_id, page_markdown)
        print(f"Ingested individual Confluence page {index+1}/{num_pages}.")
        logger.info("Importing Confluence page", page_id=page_id, progress=f"{index+1}/{num_pages}")

    logger.info("Import of individual Confluence pages completed")

    logger.info("Synchronization Confluence to c4 completed")


__main__()
