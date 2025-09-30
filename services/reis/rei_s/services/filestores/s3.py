from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


class S3FileStoreAdapter(FileStoreAdapter):
    def add_document(self, document: SourceFile) -> None:
        raise NotImplementedError

    def delete(self, doc_id: str) -> None:
        raise NotImplementedError

    def get_document(self, doc_id: str) -> SourceFile:
        raise NotImplementedError

    def exists(self, doc_id: str) -> bool:
        raise NotImplementedError

    @classmethod
    def create(cls, config: Config) -> "S3FileStoreAdapter":
        return S3FileStoreAdapter()
