from confluence_importer import confluence
from confluence_importer.c4 import clear_previous_ingests, import_confluence_page
from confluence_importer.markdown import html_to_markdown
from confluence_importer.logger import logger

from confluence_importer.config import config

space_keys = config.confluence_space_keys_to_import
page_ids = config.confluence_page_ids_to_import


def main():
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
        print(f"Ingested individual Confluence page {index + 1}/{num_pages}.")
        logger.info("Importing Confluence page", page_id=page_id, progress=f"{index + 1}/{num_pages}")

    logger.info("Import of individual Confluence pages completed")

    logger.info("Synchronization Confluence to c4 completed")


main()
