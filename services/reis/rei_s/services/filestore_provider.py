from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.services.filestores.filesystem import FSFileStoreAdapter
from rei_s.services.filestores.postgres import PGFileStoreAdapter
from rei_s.services.filestores.s3 import S3FileStoreAdapter


def get_filestore(
    config: Config,
) -> FileStoreAdapter | None:
    if config.file_store_type is None:
        # this is an optional feature
        return None
    elif config.file_store_type == "filesystem":
        return FSFileStoreAdapter.create(config=config)
    elif config.file_store_type == "postgres":
        return PGFileStoreAdapter.create(config=config)
    elif config.file_store_type == "s3":
        return S3FileStoreAdapter.create(config=config)
    else:
        raise ValueError(f"Store type {config.file_store_type} not supported")
