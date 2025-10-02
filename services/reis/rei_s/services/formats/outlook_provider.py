from datetime import datetime
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from oxmsg import Message

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.html_provider import HtmlProvider
from rei_s.types.source_file import SourceFile, temp_file
from rei_s.services.formats.utils import generate_pdf_from_md, validate_chunk_overlap, validate_chunk_size


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
        msg = Message.load(str(file.path))

        text = msg.html_body
        if text is None:
            text = msg.body
        if text is None:
            text = ""

        docs = [
            Document(
                text,
                metadata={
                    "source": file.file_name,
                    "sender": msg.sender,
                    "date": msg.sent_date,
                    "subject": msg.subject,
                },
            )
        ]

        for doc in docs:
            for key, value in doc.metadata.items():
                if isinstance(value, datetime):
                    doc.metadata[key] = value.isoformat()

        chunks = self.splitter(chunk_size, chunk_overlap).split_documents(docs)

        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        msg = Message.load(str(file.path))

        html = msg.html_body
        if html is not None:
            with temp_file(html.encode()) as f:
                f.id = file.id
                return HtmlProvider().convert_file_to_pdf(f)

        text = msg.body
        if text is None:
            text = "[empty body]"

        markdown = f"# From: {msg.sender}\nSubject: {msg.subject}\n\n{text}"

        return generate_pdf_from_md(markdown, file.id, file.file_name)
