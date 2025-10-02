from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


class DevNullFileStoreAdapter(FileStoreAdapter):
    def add_document(self, document: SourceFile) -> None:
        pass

    def delete(self, doc_id: str) -> None:
        pass

    def get_document(self, doc_id: str) -> SourceFile:
        raise FileNotFoundError()

    def exists(self, doc_id: str) -> bool:
        return False

    @classmethod
    def create(cls, config: Config) -> "DevNullFileStoreAdapter":
        return cls()
