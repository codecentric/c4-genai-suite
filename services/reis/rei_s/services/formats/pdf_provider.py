from io import BytesIO
import shutil
from typing import Any, BinaryIO

from langchain_core.documents import Document
from langchain_community.document_loaders.parsers.pdf import PDFMinerParser, PyPDFParser
from langchain_community.document_loaders.generic import GenericLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
import pdfminer
import pypdf

from rei_s import logger
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import BytesLoader, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile
from rei_s.utils import get_new_file_path


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

        try:
            documents = loader.load()
            parser_info = f"PDFMiner {pdfminer.__version__}"
        except Exception as e:
            # Fallback to PyPDF if PDFMiner fails
            # sometimes PyPDF is more tolerant to malformed PDFs
            logger.warning(f"PDFMiner failed to load PDF {file.id}, falling back to PyPDF. Error: `{e}`")
            loader = GenericLoader(
                blob_loader=BytesLoader(BytesIO(file.buffer)),
                blob_parser=PyPDFParser(extract_images=False, mode="page"),
            )
            documents = loader.load()
            parser_info = f"PyPDF {pypdf.__version__}"

        uninteresting_metadata = [
            "producer",
            "creator",
            "creationdate",
            "moddate",
            "ptex.fullbanner",
        ]

        for doc in documents:
            doc.metadata["pdf_parser"] = parser_info
            if "page" in doc.metadata:
                # this loader starts to count at 0
                # since convention for pdfs (and books, ...) is to start at 1, we need to increase it here
                doc.metadata["page"] += 1
            for key in uninteresting_metadata:
                if key in doc.metadata:
                    del doc.metadata[key]

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(documents)

        # apparently we can encounter 0x00 bytes, which can not be handled by pgvector
        for c in chunks:
            c.page_content = c.page_content.replace("\x00", "\ufffd")

        return chunks

    @property
    def may_start_separate_process_for_converting(self) -> bool:
        # pdf files are converted to pdf by a simple copy, which does not need a subprocess
        return False

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        path = get_new_file_path(extension="pdf")
        shutil.copy(file.path, path)
        return SourceFile(id=file.id, path=path, mime_type="application/pdf", file_name=file.file_name)
