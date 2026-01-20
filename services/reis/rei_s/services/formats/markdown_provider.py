import re
from typing import Any

from langchain_core.documents import Document
from langchain_text_splitters import MarkdownTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import generate_pdf_from_md_file, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


def parse_frontmatter(text: str) -> tuple[dict[str, str], str]:
    """Parse frontmatter from markdown text.

    Frontmatter is expected at the beginning of the file, enclosed by "---" on their own lines.
    Each line within the frontmatter should be in the format "key: value".

    Args:
        text: The markdown text to parse.

    Returns:
        A tuple of (metadata dict, remaining content without frontmatter).
    """
    metadata: dict[str, str] = {}

    if not text.startswith("---"):
        return metadata, text

    match = re.match(r"^---\r?\n(.*?)\r?\n---\r?\n?", text, re.DOTALL)
    if not match:
        return metadata, text

    frontmatter_content = match.group(1)
    remaining_content = text[match.end() :]

    for line in frontmatter_content.split("\n"):
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        metadata[key.strip()] = value.strip()

    return metadata, remaining_content


class MarkdownProvider(AbstractFormatProvider):
    name = "markdown"

    file_name_extensions = [".md"]

    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 0, **_kwargs: Any) -> None:
        super().__init__()
        self.default_chunk_size = chunk_size
        self.default_chunk_overlap = chunk_overlap

    def splitter(self, chunk_size: int | None = None, chunk_overlap: int | None = None) -> MarkdownTextSplitter:
        chunk_size = validate_chunk_size(chunk_size, self.default_chunk_size)
        chunk_overlap = validate_chunk_overlap(chunk_overlap, self.default_chunk_overlap)
        return MarkdownTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)

    def process_file(
        self, file: SourceFile, chunk_size: int | None = None, chunk_overlap: int | None = None
    ) -> list[Document]:
        text = file.buffer.decode()

        # Parse frontmatter and extract metadata
        frontmatter_metadata, content = parse_frontmatter(text)

        chunks = self.splitter(chunk_size, chunk_overlap).create_documents([content])

        # Add frontmatter metadata to each chunk
        if frontmatter_metadata:
            for chunk in chunks:
                chunk.metadata.update(frontmatter_metadata)

        return chunks

    def convert_file_to_pdf(self, file: SourceFile) -> SourceFile:
        return generate_pdf_from_md_file(file)
