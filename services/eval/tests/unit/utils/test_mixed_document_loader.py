from typing import Iterator
from unittest.mock import MagicMock, patch

import pytest


@pytest.mark.parametrize(
    "file_path,expected_loader_name",
    [
        ("document.pdf", "PyPDFLoader"),
        ("document.txt", "TextLoader"),
        ("document.md", "TextLoader"),
    ],
)
@patch("llm_eval.utils.mixed_document_loader.PyPDFLoader")
@patch("llm_eval.utils.mixed_document_loader.TextLoader")
def test_selects_loader_correctly(
    mock_text_loader: MagicMock,
    mock_pdf_loader: MagicMock,
    file_path: str,
    expected_loader_name: str,
) -> None:
    from llm_eval.utils.mixed_document_loader import MixedDocumentLoader

    mock_text_loader.return_value = "TextLoader"
    mock_pdf_loader.return_value = "PyPDFLoader"

    mixed_loader = MixedDocumentLoader(file_path=file_path)

    loader = mixed_loader.select_loader()

    assert loader == expected_loader_name


def test_raises_value_error_for_unsupported_file_format() -> None:
    from llm_eval.utils.mixed_document_loader import MixedDocumentLoader

    mixed_loader = MixedDocumentLoader(file_path="document.docx")

    with pytest.raises(ValueError, match="docx"):
        mixed_loader.select_loader()


@patch("llm_eval.utils.mixed_document_loader.TextLoader")
def test_lazy_loads_successfully(
    mock_text_loader: MagicMock,
) -> None:
    docs = ["Document 1", "Document 2"]
    mock_text_loader.return_value.lazy_load.return_value = iter(docs)

    from llm_eval.utils.mixed_document_loader import MixedDocumentLoader

    mixed_loader = MixedDocumentLoader(file_path="document.txt")

    lazy_load = mixed_loader.lazy_load()
    assert isinstance(lazy_load, Iterator)

    assert list(lazy_load) == docs
