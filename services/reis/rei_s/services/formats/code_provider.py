from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import Language, RecursiveCharacterTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import generate_preview_pdf_from_text, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


languages = {
    ".cpp": Language.CPP,
    ".go": Language.GO,
    ".java": Language.JAVA,
    ".js": Language.JS,
    ".php": Language.PHP,
    ".proto": Language.PROTO,
    ".py": Language.PYTHON,
    ".rb": Language.RUBY,
    ".rs": Language.RUST,
    ".rst": Language.RST,
    ".scala": Language.SCALA,
    ".swift": Language.SCALA,
}


class CodeProvider(AbstractFormatProvider):
    name = "code"

    file_name_extensions = [
        ".cpp",
        ".go",
        ".java",
        ".js",
        ".php",
        ".proto",
        ".py",
        ".rb",
        ".rs",
        ".rst",
        ".scala",
        ".swift",
    ]

    def __init__(self, chunk_size: int = 4000, chunk_overlap: int = 200, **_kwargs: Any) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size
        self.default_chunk_overlap = chunk_overlap

    def splitter(
        self, language: Language | None, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> RecursiveCharacterTextSplitter:
        if language is None:
            raise ValueError("Invalid language found.")

        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        chunk_overlap = validate_chunk_overlap(chunk_overlap, self.default_chunk_overlap)
        return RecursiveCharacterTextSplitter.from_language(
            language, chunk_size=chunk_size, chunk_overlap=chunk_overlap
        )

    def get_language(self, file: SourceFile) -> Language | None:
        language = None
        for ext in self.file_name_extensions:
            if file.file_name.endswith(ext):
                language = languages[ext]
                break
        return language

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        text = file.buffer.decode()

        language = self.get_language(file)

        chunks = self.splitter(language, chunk_size, chunk_overlap).create_documents([text])
        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        return generate_preview_pdf_from_text(file, file.ext())
