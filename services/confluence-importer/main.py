from confluence_importer import confluence
from confluence_importer.c4 import clear_previous_ingests, import_confluence_page
from confluence_importer.markdown import html_to_markdown
from confluence_importer.logger import logger

from confluence_importer.config import config

space_keys = config.confluence_space_keys_to_import
page_ids = config.confluence_page_ids_to_import


def process_confluence_spaces(page_import_counter):
    logger.info("Starting import of Confluence Spaces", num_spaces=len(space_keys))

    for space_key in space_keys:
        logger.info("Starting import of Confluence Space", space_key=space_key)
        pages = confluence.get_pages_for_space(space_key)

        for index, page in enumerate(pages, start=1):
            try:
                page_markdown = html_to_markdown(page)
                import_confluence_page(page.id, page_markdown)
                page_import_counter["success"] += 1
                logger.info("Import Confluence page", space_key=space_key, page_id=page.id, page_count=f"{index}")
            except Exception as e:
                page_import_counter["error"] += 1
                logger.error(
                    "Error importing Confluence page", error=str(e), space_key=space_key, page_id=page.id,
                    page_count=f"{index}"
                )

        logger.info("Import of Confluence Space completed", space_key=space_key)
    logger.info("Import of all Confluence Spaces completed")


def process_individual_pages(page_import_counter):
    num_pages = len(page_ids)
    logger.info("Starting import of individual Confluence pages", num_pages=num_pages)

    for index, page_id in enumerate(page_ids):
        try:
            page = confluence.get_page(page_id)
            page_markdown = html_to_markdown(page)
            import_confluence_page(page_id, page_markdown)
            page_import_counter["success"] += 1
            logger.info("Import Confluence page", page_id=page_id, progress=f"{index + 1}/{num_pages}")
        except Exception as e:
            page_import_counter["error"] += 1
            logger.error(
                "Error importing Confluence page", error=str(e), page_id=page_id, progress=f"{index + 1}/{num_pages}"
            )

    logger.info("Import of individual Confluence pages completed")


def log_final_results(page_import_counter):
    if page_import_counter["error"] > 0:
        logger.error("Synchronization Confluence to c4 completed with errors! See log for more information.",
                     page_import_counter=page_import_counter)
    else:
        logger.info("Synchronization Confluence to c4 completed.", page_import_counter)


def main():
    logger.info("Starting synchronization Confluence to c4")

    clear_previous_ingests()

    page_import_counter = {"error": 0, "success": 0}
    process_confluence_spaces(page_import_counter)
    process_individual_pages(page_import_counter)
    log_final_results(page_import_counter)


main()
