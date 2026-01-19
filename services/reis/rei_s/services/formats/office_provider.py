from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.pdf_provider import PdfProvider
from rei_s.services.formats.utils import convert_office_to_pdf, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


class OfficeProvider(AbstractFormatProvider):
    name = "generic_office"

    file_name_extensions = []

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, **_kwargs: Any) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size
        self.default_chunk_overlap = chunk_overlap

    def splitter(
        self, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> RecursiveCharacterTextSplitter:
        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        chunk_overlap = validate_chunk_overlap(chunk_overlap, self.default_chunk_overlap)
        return RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        pdf = self.convert_file_to_pdf(file)
        return PdfProvider().process_file(pdf, chunk_size, chunk_overlap)

    @property
    def may_start_separate_process_for_chunking(self) -> bool:
        # office files are converted to pdf and then processed with the pdf provider
        return PdfProvider().may_start_separate_process_for_chunking

    @property
    def may_start_separate_process_for_converting(self) -> bool:
        # office files are converted in libreoffice, which is already a subprocess
        # no need to wrap it in our own subprocess
        return False

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        return convert_office_to_pdf(file)
