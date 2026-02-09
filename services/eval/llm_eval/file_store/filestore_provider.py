from functools import lru_cache

from llm_eval.file_store.filestore_adapter import FileStoreAdapter
from llm_eval.file_store.s3_adapter import S3FileStoreAdapter
from llm_eval.settings import SETTINGS


@lru_cache(maxsize=1)
def get_filestore() -> FileStoreAdapter | None:
    """Get the configured file store adapter.

    Returns:
        FileStoreAdapter | None: The configured adapter,
            or None if file store is not configured

    Raises:
        ValueError: If file store type is not supported or configuration is invalid
    """
    file_store_type = SETTINGS.file_store.type

    if file_store_type is None:
        # File store is optional
        return None
    elif file_store_type == "s3":
        return S3FileStoreAdapter.create(
            endpoint_url=SETTINGS.file_store.s3_endpoint_url,
            access_key_id=SETTINGS.file_store.s3_access_key_id,
            secret_access_key=SETTINGS.file_store.s3_secret_access_key,
            bucket_name=SETTINGS.file_store.s3_bucket_name,
            region_name=SETTINGS.file_store.s3_region_name,
        )
    else:
        raise ValueError(f"File store type '{file_store_type}' is not supported")
