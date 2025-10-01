from datetime import datetime
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredEmailLoader
import pypandoc

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.types.source_file import SourceFile, temp_file
from rei_s.services.formats.utils import validate_chunk_overlap, validate_chunk_size
from rei_s.utils import get_new_file_path


class OutlookProvider(AbstractFormatProvider):
    name = "outlook"

    file_name_extensions = [
        ".msg"
        # this provider does also support the .eml format
    ]

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 0, **_kwargs: Any) -> None:
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
        loader = UnstructuredEmailLoader(
            file.path, mode="elements", process_attachments=True, metadata_filename=file.path
        )
        docs = loader.load()

        for doc in docs:
            for key, value in doc.metadata.items():
                if isinstance(value, datetime):
                    doc.metadata[key] = value.isoformat()

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(docs)

        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        loader = UnstructuredEmailLoader(
            file.path, mode="elements", process_attachments=True, metadata_filename=file.path
        )
        docs = loader.load()

        plain = "\n".join([doc.page_content for doc in docs])
        path = get_new_file_path(extension="pdf")

        with temp_file(plain.encode()) as plain_file:
            pypandoc.convert_file(plain_file.path, "pdf", format="plain", outputfile=path)
        return SourceFile(id=file.id, path=path, mime_type="application/pdf", file_name=file.file_name)
