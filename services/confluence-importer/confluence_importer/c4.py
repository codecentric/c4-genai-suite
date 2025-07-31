import requests

from confluence_importer.logger import logger
from confluence_importer.config import config

c4_base_url = config.c4_base_url
bucket_id = config.c4_bucket_id


def clear_previous_ingests() -> None:
    """
    Clears all previously ingested files from the C4 bucket.
    """
    logger.info("Starting deletion of all Confluence pages from c4", bucket_id=bucket_id)

    deletion_counter = {"success": 0, "error": 0}

    files = fetch_bucket_files_list()

    for index, item in enumerate(files):
        num_items = len(files)
        file_name = item.get("fileName")

        is_confluence_page_file = file_name.startswith("confluence_page_") and file_name.endswith(".md")

        if is_confluence_page_file:
            try:
                delete_confluence_page(item.get("id"))
            except Exception as e:
                deletion_counter["error"] += 1
                logger.error(
                    "Error deleting Confluence page from c4",
                    bucket_id=bucket_id,
                    file_name=file_name,
                    progress=f"{index + 1}/{num_items}",
                    status="error",
                    error=str(e),
                )
            else:
                deletion_counter["success"] += 1
                logger.info(
                    "Delete Confluence page in c4",
                    bucket_id=bucket_id,
                    file_name=file_name,
                    progress=f"{index + 1}/{num_items}",
                    status="success",
                )

    if deletion_counter["error"] > 0:
        logger.error(
            "Deletion of Confluence pages from c4 completed with errors! See log for more information.",
            bucket_id=bucket_id,
            deletion_counter=deletion_counter,
        )
    else:
        logger.info(
            "Deletion of Confluence pages from c4 completed.", bucket_id=bucket_id, deletion_counter=deletion_counter
        )


def delete_confluence_page(file_id):
    requests.delete(f"{c4_base_url}/api/buckets/{bucket_id}/files/{file_id}", headers={"x-api-key": config.c4_token})


def fetch_bucket_files_list():
    page = 1
    batch_size = 50

    items: list[str] = []

    while True:
        logger.debug("Fetching partial list of files from c4 ", bucket_id=bucket_id, page=page)
        response = requests.get(f"{c4_base_url}/api/buckets/{bucket_id}/files", headers={"x-api-key": config.c4_token})

        total = response.json().get("total")

        items.extend(response.json().get("items"))

        if page * batch_size >= total:
            break
        else:
            page += 1

    logger.info("Full list of files in c4 fetched", bucket_id=bucket_id, num_files=total)

    return items


def import_confluence_page(page_id: int, page_markdown: str) -> None:
    """
    Ingests a Confluence page into the C4 bucket.

    Args:
        page_markdown: The HTML content of the Confluence page to ingest
        page_id: The ID of the Confluence page to ingest
    """
    files = {"file": (f"confluence_page_{page_id}.md", page_markdown, "text/markdown")}
    response = requests.post(
        f"{c4_base_url}/api/buckets/{bucket_id}/files", files=files, headers={"x-api-key": config.c4_token}
    )

    if response.status_code == 201:
        logger.debug("Upload Confluence page to c4", bucket_id=bucket_id, page_id=page_id, status="success")
    else:
        logger.error(
            "Upload Confluence page to c4",
            bucket_id=bucket_id,
            page_id=page_id,
            status="error",
            c4_status_code=response.status_code,
            c4_error_response=response.text,
        )
