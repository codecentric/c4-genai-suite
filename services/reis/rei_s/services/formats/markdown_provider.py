import json
import re
from typing import Any

import yaml
from langchain_core.documents import Document
from langchain_text_splitters import MarkdownTextSplitter

from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats.utils import generate_pdf_from_md_file, validate_chunk_overlap, validate_chunk_size
from rei_s.types.source_file import SourceFile


def parse_frontmatter(text: str) -> tuple[dict[str, Any], str]:
    """Parse YAML frontmatter from markdown text.

    Frontmatter is expected at the beginning of the file, enclosed by "---" on their own lines.

    Args:
        text: The markdown text to parse.

    Returns:
        A tuple of (metadata dict, remaining content without frontmatter).
    """
    match = re.match(r"^\s*---\s*\r?\n(.*?)\r?\n\s*---\s*\r?\n", text, re.DOTALL)
    if not match:
        return {}, text

    frontmatter_content = match.group(1)
    remaining_content = text[match.end() :]

    try:
        parsed = yaml.safe_load(frontmatter_content)
        if not isinstance(parsed, dict):
            return {}, text
    except yaml.YAMLError:
        return {}, text

    # Convert nested objects and lists to JSON strings, keep primitives as-is
    metadata = {k: json.dumps(v) if isinstance(v, (dict, list)) else v for k, v in parsed.items()}

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
