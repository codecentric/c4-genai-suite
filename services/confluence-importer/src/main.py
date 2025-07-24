import os

import confluence
from c4 import clear_previous_ingests, ingest_confluence_page
from markdown import html_to_markdown

space_keys = os.environ.get("CONFLUENCE_SPACE_KEYS_TO_IMPORT").split(",")
page_ids = [int(page_id) for page_id in os.environ.get("CONFLUENCE_PAGE_IDS_TO_IMPORT").split(",")]


def __main__():
    print("Starting Confluence ingestion into c4")
    clear_previous_ingests()

    for space_key in space_keys:
        print(f"Starting ingestion of Confluence space with key '{space_key}'")
        pages = confluence.get_pages_for_space(space_key)

        for page in pages:
            page_markdown = html_to_markdown(page)
            ingest_confluence_page(page.id, page_markdown)

        print(f"Ingestion of Confluence space with key '{space_key}' completed")


    for page_id in page_ids:
        page = confluence.get_page(page_id)
        page_markdown = html_to_markdown(page)
        ingest_confluence_page(page_id, page_markdown)

    print("Confluence ingestion into c4 completed")


__main__()
