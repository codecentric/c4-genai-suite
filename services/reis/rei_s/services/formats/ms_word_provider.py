from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredWordDocumentLoader
import pypandoc

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile
from rei_s.utils import get_new_file_path


class MsWordProvider(AbstractFormatProvider):
    name = "ms_word"

    file_name_extensions = [".docx"]

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
        loader = UnstructuredWordDocumentLoader(file.path)
        docs = loader.load()

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(docs)
        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        path = get_new_file_path(extension="pdf")
        pypandoc.convert_file(file.path, "pdf", format="docx", outputfile=path)
        return SourceFile(id=file.id, path=path, mime_type="application/pdf", file_name=file.file_name)
