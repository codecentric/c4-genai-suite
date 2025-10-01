from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import UnstructuredExcelLoader
import pypandoc

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile, temp_file
from rei_s.utils import get_new_file_path


class MsExcelProvider(AbstractFormatProvider):
    name = "ms_excel"

    file_name_extensions = [".xlsx"]

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

    def parse_file(self, file: SourceFile) -> list[Document]:
        loader = UnstructuredExcelLoader(file.path, mode="elements")
        docs = loader.load()

        misleading_metadata = [
            "text_as_html",  # this property is too large to save it in the db, also useless for us
            "filename",  # will be the temporary filename
            "file_directory",  # will be the temporary path
            "last_modified",  # will be time of upload
            "element_id",  # not useful
        ]
        for doc in docs:
            for key in misleading_metadata:
                if key in doc.metadata:
                    del doc.metadata[key]

        return docs

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        docs = self.parse_file(file)

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(docs)
        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        docs = self.parse_file(file)

        plain = "\n".join([doc.page_content for doc in docs])
        path = get_new_file_path(extension="pdf")

        with temp_file(plain.encode()) as plain_file:
            pypandoc.convert_file(plain_file.path, "pdf", format="plain", outputfile=path)
        return SourceFile(id=file.id, path=path, mime_type="application/pdf", file_name=file.file_name)
