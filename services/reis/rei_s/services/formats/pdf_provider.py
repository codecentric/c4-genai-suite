from io import BytesIO
from typing import Any, BinaryIO

from langchain_core.documents import Document
from langchain_community.document_loaders.parsers.pdf import PDFMinerParser
from langchain_community.document_loaders.generic import GenericLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pdfminer

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import BytesLoader, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


# langchain PDFMinerLoader will fail for pdfs without "creationdate" metadata
# this one is a fixed version for our needs
class TolerantPDFMinerParser(PDFMinerParser):
    def _get_metadata(
        self,
        fp: BinaryIO,
        password: str = "",
        caching: bool = True,
    ) -> dict[str, Any]:
        metadata = super()._get_metadata(fp, password, caching)

        defaults = {"producer": "REIS", "creator": "REIS", "creationdate": ""}

        for key, val in defaults.items():
            # match case insensitive
            if not any(k.lower() == key.lower() for k in metadata.keys()):
                metadata[key] = val

        return metadata


class PdfProvider(AbstractFormatProvider):
    name = "pdf"

    file_name_extensions = [".pdf"]

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
        loader = GenericLoader(
            blob_loader=BytesLoader(BytesIO(file.buffer)),
            blob_parser=TolerantPDFMinerParser(extract_images=False, mode="page"),
        )

        documents = loader.load()

        for doc in documents:
            doc.metadata["pdf_parser"] = f"PDFMiner {pdfminer.__version__}"
            if "page" in doc.metadata:
                # this loader starts to count at 0
                # since convention for pdfs (and books, ...) is to start at 1, we need to increase it here
                doc.metadata["page"] += 1

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(documents)

        # apparently we can encounter 0x00 bytes, which can not be handled by pgvector
        for c in chunks:
            c.page_content = c.page_content.replace("\x00", "\ufffd")

        return chunks
