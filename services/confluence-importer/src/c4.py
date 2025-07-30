import os
import requests

from src.logger import logger

c4_base_url = os.environ.get("C4_BASE_URL")
bucket_id = os.environ.get("C4_BUCKET_ID")

def clear_previous_ingests() -> None:
    """
    Clears all previously ingested files from the C4 bucket.
    """
    page = 1
    batch_size = 50

    items: list[str] = []

    while True:
        logger.debug("Fetching partial list of files from c4 ", bucket_id=bucket_id, page=page)
        response = requests.get(f'{c4_base_url}/api/buckets/{bucket_id}/files',
                            headers={"x-api-key": os.environ.get("C4_TOKEN")})

        total = response.json().get("total")

        items.extend(response.json().get("items"))

        if page* batch_size >= total:
            break
        else:
            page += 1

    logger.info("Full list of files in c4 fetched", bucket_id=bucket_id, num_files=total)

    for index, item in enumerate(items):
        num_items = len(items)
        file_name = item.get("fileName")

        if file_name.startswith("confluence_page_") and file_name.endswith(".md"):
            requests.delete(
                f'{c4_base_url}/api/buckets/{bucket_id}/files/{item.get("id")}',
                headers={"x-api-key": os.environ.get("C4_TOKEN")}
            )
            logger.info("Delete Confluence page in c4", bucket_id=bucket_id, file_name=file_name, progress=f"{index + 1}/{num_items}", status="success")
    logger.info("All Confluence pages deleted from c4", bucket_id=bucket_id)


def import_confluence_page(page_id: int, page_markdown: str) -> None:
    """
    Ingests a Confluence page into the C4 bucket.
    
    Args:
        page_markdown: The HTML content of the Confluence page to ingest
        page_id: The ID of the Confluence page to ingest
    """
    files = {'file': (f"confluence_page_{page_id}.md", page_markdown, "text/markdown")}
    response = requests.post('http://localhost:8080/api/buckets/89/files', files=files,
                         headers={"x-api-key": os.environ.get("C4_TOKEN")})

    if response.status_code == 201:
        logger.debug("Upload Confluence page to c4", bucket_id=bucket_id, page_id=page_id, status="success")
    else:
        logger.error("Upload Confluence page to c4", bucket_id=bucket_id, page_id=page_id, status="error", c4_status_code=response.status_code, c4_error_response=response.text)
