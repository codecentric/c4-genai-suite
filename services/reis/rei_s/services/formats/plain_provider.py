from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import validate_chunk_overlap, validate_chunk_size, generate_preview_pdf_from_text
from rei_s.types.source_file import SourceFile


class PlainProvider(AbstractFormatProvider):
    name = "plain"

    file_name_extensions = [".txt"]

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
        text = file.buffer.decode()

        chunks = self.splitter(chunk_size, chunk_overlap).create_documents([text])
        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        return generate_preview_pdf_from_text(file, "plain")
