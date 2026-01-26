"""Module for interacting with the C4 API to manage Confluence content."""

from typing import TypedDict
import requests

from confluence_importer.logger import logger
from confluence_importer.config import config

c4_base_url = config.c4_base_url
bucket_id = config.c4_bucket_id


def clear_previous_ingests() -> None:
    """Clears all previously ingested files from the C4 bucket.

    Raises:
        requests.HTTPError: If fetching the bucket files list fails
    """
    logger.info("Starting deletion of all Confluence pages from c4", bucket_id=bucket_id)

    deletion_counter = {"success": 0, "error": 0}

    try:
        files = fetch_bucket_files_list()
    except requests.HTTPError as e:
        logger.error(
            "Failed to fetch bucket files list from c4",
            bucket_id=bucket_id,
            error=str(e),
        )
        raise

    for index, item in enumerate(files):
        num_items = len(files)
        file_name = item["fileName"]

        is_confluence_page_file = file_name.startswith("confluence_page_") and file_name.endswith(".md")

        if is_confluence_page_file:
            try:
                delete_confluence_page(item["id"])
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


def delete_confluence_page(file_id: int) -> None:
    """Deletes a file from the C4 bucket by its ID.

    Args:
        file_id: The ID of the file to delete from the C4 bucket

    Raises:
        requests.HTTPError: If the API request fails
    """
    response = requests.delete(
        f"{c4_base_url}/api/buckets/{bucket_id}/files/{file_id}", headers={"x-api-key": config.c4_token}
    )
    response.raise_for_status()


class C4BucketFileItem(TypedDict):
    """TypedDict representing a file item in the C4 bucket."""

    id: int
    fileName: str


def fetch_bucket_files_list(batch_size: int = 100) -> list[C4BucketFileItem]:
    """Fetches the list of all files in the C4 bucket.

    Returns:
        A list of dictionaries containing file information from the C4 bucket

    Raises:
        requests.HTTPError: If the API request fails
    """
    page = 0

    items: list[C4BucketFileItem] = []

    while True:
        logger.debug("Fetching partial list of files from c4 ", bucket_id=bucket_id, page=page)
        response = requests.get(
            f"{c4_base_url}/api/buckets/{bucket_id}/files",
            headers={"x-api-key": config.c4_token},
            params={"page": page, "pageSize": batch_size},
        )
        response.raise_for_status()

        total = response.json().get("total", 0)
        items_in_page = response.json().get("items", [])

        items.extend(items_in_page)

        if (page + 1) * batch_size >= total or len(items_in_page) == 0:
            break
        else:
            page += 1

    logger.info("Full list of files in c4 fetched", bucket_id=bucket_id, num_files=total)

    return items


class C4ImportError(Exception):
    """Exception raised when a C4 import operation fails."""

    pass


def import_confluence_page(page_id: int, page_markdown: str) -> None:
    """Ingests a Confluence page into the C4 bucket.

    Args:
        page_markdown: The Markdown content of the Confluence page to ingest
        page_id: The ID of the Confluence page to ingest

    Raises:
        C4ImportError: If the API request fails or returns a non-201 status code
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
        raise C4ImportError(f"Failed to import page {page_id}: {response.status_code} - {response.text}")
