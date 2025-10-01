import json
from typing import Any
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveJsonSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import generate_preview_pdf_from_text, validate_chunk_size
from rei_s.types.source_file import SourceFile


class JsonProvider(AbstractFormatProvider):
    name = "json"

    file_name_extensions = [
        ".json",
    ]

    def __init__(self, chunk_size: int = 1000, **_kwargs: Any) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size

    def splitter(self, chunk_size: int | None = None) -> RecursiveJsonSplitter:
        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        return RecursiveJsonSplitter(max_chunk_size=chunk_size)

    def process_file(self, file: SourceFile, chunk_size: int | None = None) -> list[Document]:
        text = file.buffer.decode()

        json_dict = json.loads(text)

        chunks = self.splitter(chunk_size).create_documents([json_dict])
        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        return generate_preview_pdf_from_text(file, "json")
