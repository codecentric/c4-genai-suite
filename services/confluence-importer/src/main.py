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
        num_pages = len(pages)

        for index, page in enumerate(pages):
            page_markdown = html_to_markdown(page)
            ingest_confluence_page(page.id, page_markdown)
            print(f"Ingested Confluence page {index+1}/{num_pages} of space '{space_key}'.")

        print(f"Ingestion of Confluence space with key '{space_key}' completed.")

    num_pages = len(page_ids)
    for index, page_id in enumerate(page_ids):
        page = confluence.get_page(page_id)
        page_markdown = html_to_markdown(page)
        ingest_confluence_page(page_id, page_markdown)
        print(f"Ingested individual Confluence page {index+1}/{num_pages}.")

    print("Confluence ingestion into c4 completed")


__main__()
