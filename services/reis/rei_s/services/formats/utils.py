from io import BytesIO
from typing import Generator

from langchain_core.documents.base import Blob
from langchain_community.document_loaders.blob_loaders import BlobLoader

import pypandoc
from rei_s.types.source_file import SourceFile, temp_file
from rei_s.utils import get_new_file_path


def check_file_name_extensions(file_name_extensions: list[str], file: SourceFile) -> bool:
    for ext in file_name_extensions:
        if file.file_name.lower().endswith(ext.lower()):
            return True

    return False


def validate_chunk_size(chunk_size: int | None, default: int) -> int:
    chunk_size = chunk_size if chunk_size is not None else default
    if chunk_size <= 0:
        raise ValueError("chunk_size needs to be >0")
    return chunk_size


def validate_chunk_overlap(chunk_overlap: int | None, default: int) -> int:
    chunk_overlap = chunk_overlap if chunk_overlap is not None else default
    if chunk_overlap < 0:
        raise ValueError("chunk_overlap needs to be >=0")
    return chunk_overlap


class BytesLoader(BlobLoader):
    def __init__(self, buffer: BytesIO) -> None:
        self.buffer = buffer

    def yield_blobs(self) -> Generator[Blob, None, None]:
        yield Blob.from_data(self.buffer.getvalue(), path="stream")


class ProcessingError(Exception):
    def __init__(self, message: str, status: int) -> None:
        super().__init__(message)
        self.status = status
        self.message = message


def generate_preview_pdf_from_text(file: SourceFile, format_: str) -> SourceFile:
    text = file.buffer.decode()
    markdown_content = f"```{format_}\n{text}\n```"
    path = get_new_file_path(extension="pdf")
    with temp_file(markdown_content.encode()) as code_file:
        pypandoc.convert_file(code_file.path, "pdf", format="md", outputfile=path)
    return SourceFile(id=file.id, path=path, mime_type="application/pdf", file_name=file.file_name)
