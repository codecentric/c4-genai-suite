from abc import ABC, abstractmethod

from rei_s.types.source_file import SourceFile


class FileStoreAdapter(ABC):
    @abstractmethod
    def add_document(self, document: SourceFile) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, doc_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def get_document(self, doc_id: str) -> SourceFile:
        raise NotImplementedError

    @abstractmethod
    def exists(self, doc_id: str) -> bool:
        raise NotImplementedError
