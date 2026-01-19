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
    def previewable(self) -> bool:
        """Whether this provider offers a sensible pdf preview."""
        return True

    @property
    def may_start_separate_process_for_chunking(self) -> bool:
        """Whether this provider benefits from processing in a separate process."""
        return True

    @property
    def may_start_separate_process_for_converting(self) -> bool:
        """Whether this provider benefits from converting to a pdf preview in a separate process."""
        return True
