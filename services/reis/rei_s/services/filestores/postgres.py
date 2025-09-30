from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


class PGFileStoreAdapter(FileStoreAdapter):
    def add_document(self, document: SourceFile) -> None:
        raise NotImplementedError

    def delete(self, doc_id: str) -> None:
        raise NotImplementedError

    def get_document(self, doc_id: str) -> SourceFile:
        raise NotImplementedError

    @classmethod
    def create(cls, config: Config) -> "PGFileStoreAdapter":
        return PGFileStoreAdapter()
