from io import BytesIO
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time
from typing import Generator
from uuid import uuid4

from langchain_core.documents.base import Blob
from langchain_community.document_loaders.blob_loaders import BlobLoader
import markdown
from pygments.formatters import HtmlFormatter  # type: ignore[import-untyped]
from weasyprint import HTML

from rei_s import logger
from rei_s.types.source_file import SourceFile
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


def generate_pdf_from_md_file(file: SourceFile, format_: str | None = None) -> SourceFile:
    markdown_text = file.buffer.decode()
    if format_ in {"plain", "md", "markdown"}:
        markdown_text = markdown_text
    elif format_:
        markdown_text = f"```{format_}\n{markdown_text}\n```"
    # TODO: should we prettify json, xml and yaml?

    return generate_pdf_from_md(markdown_text, file.id, file.file_name)


def generate_pdf_from_md(markdown_text: str, doc_id: str, file_name: str) -> SourceFile:
    # Convert markdown to HTML
    html = markdown.markdown(markdown_text, extensions=["fenced_code", "codehilite", "tables", "sane_lists"])
    formatter = HtmlFormatter(style="vs", cssclass="codehilite")
    pygments_css = formatter.get_style_defs(".codehilite")
    html_doc = f"<html><head><style>{pygments_css}</style></head><body>{html}</body></html>"

    # Convert HTML to PDF
    path = get_new_file_path(extension="pdf")
    HTML(string=html_doc).write_pdf(path)
    return SourceFile(id=doc_id, path=path, mime_type="application/pdf", file_name=file_name)


def convert_office_to_pdf(file: SourceFile) -> SourceFile:
    output_dir = Path(tempfile.gettempdir()) / uuid4().hex
    output_dir.mkdir(parents=True, exist_ok=True)
    libreoffice_home = Path(tempfile.gettempdir()) / uuid4().hex

    cmd = [
        "soffice",
        "--headless",
        f"-env:UserInstallation=file://{libreoffice_home}",
        "--convert-to",
        "pdf",
        str(file.path),
        "--outdir",
        str(output_dir),
    ]
    logger.info(f"Converting {file.id} with args: {' '.join(cmd)}")

    # FIXME: this might fail due to a race (?) when starting multiple LibreOffice instances
    #   we need to fix this properly later
    retries = 3
    for retry in range(retries):
        libreoffice_home.mkdir(parents=True, exist_ok=True)
        try:
            subprocess.run(cmd, capture_output=True, check=True, env={"HOME": str(libreoffice_home)})
        except subprocess.CalledProcessError as e:
            logger.error(
                f"Failed to convert {file.id} to pdf, retry {retry + 1}/{retries}, "
                f"exit code {e.returncode}: {e.stdout} {e.stderr} {e!r}"
            )
            time.sleep(0.5)
        else:
            break
        finally:
            shutil.rmtree(libreoffice_home, ignore_errors=True)
    else:
        raise ValueError(f"Can not convert {file.id} to pdf, giving up")

    base = os.path.basename(file.path)
    pdf_name = os.path.splitext(base)[0] + ".pdf"
    pdf_path = os.path.join(output_dir, pdf_name)

    return SourceFile(id=file.id, path=pdf_path, mime_type="application/pdf", file_name=file.file_name, delete_dir=True)
