from typing import Any
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


class YamlProvider(AbstractFormatProvider):
    name = "yaml"

    file_name_extensions = [
        ".yml",
        ".yaml",
    ]

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, **_kwargs: Any) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size
        self.default_chunk_overlap = chunk_overlap

    def splitter(
        self, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> RecursiveCharacterTextSplitter:
        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        chunk_overlap = validate_chunk_overlap(chunk_overlap, self.default_chunk_overlap)
        return RecursiveCharacterTextSplitter(
            separators=[
                "\n---\n",  # Separates multi-document YAML
                "\n\n",  # Empty lines
                "\n- ",  # List items
                "\n  ",  # Indented lines (2 spaces)
                "\n    ",  # Further indented lines (4 spaces)
                "\n",  # Single line breaks
                ": ",  # Key-value pairs
                ", ",  # Comma-separated values
                " ",  # Single spaces
                "",  # Fallback
            ],
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
        )

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        text = file.buffer.decode()

        chunks = self.splitter(chunk_size, chunk_overlap).create_documents([text])
        return chunks
