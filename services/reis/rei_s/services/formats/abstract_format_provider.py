from abc import ABC, abstractmethod

from langchain_core.documents import Document

from rei_s.services.formats.utils import check_file_name_extensions
from rei_s.types.source_file import SourceFile


class AbstractFormatProvider(ABC):
    name: str
    file_name_extensions: list[str]

    def supports(self, file: SourceFile) -> bool:
        return check_file_name_extensions(self.file_name_extensions, file)

    @abstractmethod
    def process_file(self, file: SourceFile, chunk_size: int | None = None) -> list[Document]:
        raise NotImplementedError

    @abstractmethod
    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        raise NotImplementedError

    def clean_up(self, document: Document) -> Document:
        return document

    @property
    def enabled(self) -> bool:
        return True

    @property
    def multiprocessable(self) -> bool:
        return True
