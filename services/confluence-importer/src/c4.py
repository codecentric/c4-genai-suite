import os
import requests

c4_base_url = os.environ.get("C4_BASE_URL")
bucket_id = '89'

def clear_previous_ingests() -> None:
    """
    Clears all previously ingested files from the C4 bucket.
    """
    page = 1
    batch_size = 50

    items: list[str] = []

    while True:
        print(f"Fetching files list for bucket with '{bucket_id}' from page {page}")
        response = requests.get(f'{c4_base_url}/api/buckets/{bucket_id}/files',
                            headers={"x-api-key": os.environ.get("C4_TOKEN")})

        total = response.json().get("total")

        items.extend(response.json().get("items"))

        if page* batch_size >= total:
            break
        else:
            page += 1

    print(f"Found {len(items)} files in bucket '{bucket_id}'")

    for index, item in enumerate(items):
        num_items = len(items)
        file_name = item.get("fileName")

        if file_name.startswith("confluence_page_") and file_name.endswith(".md"):
            requests.delete(
                f'{c4_base_url}/api/buckets/{bucket_id}/files/{item.get("id")}',
                headers={"x-api-key": os.environ.get("C4_TOKEN")}
            )
            print(f"Deleted existing ingest {item.get('fileName')}. File {index+1}/{num_items}.")
    print("Cleared previous ingests")


def ingest_confluence_page(page_id: int, page_markdown: str) -> None:
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
        print(f"Successfully ingested Confluence page with ID {page_id}")
    else:
        print(f"Failed to ingest Confluence page with ID {page_id}. Status code: {response.status_code}.")
        print(response.text)
        exit(1)