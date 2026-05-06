from pathlib import Path
from typing import Iterator, Literal, cast, get_args, override

from langchain_community.document_loaders import PyPDFLoader, TextLoader
from langchain_community.document_loaders.base import BaseLoader
from langchain_core.documents import Document
from tqdm import tqdm

SupportedFileFormat = Literal["pdf", "md", "txt"]


class MixedDocumentLoader(BaseLoader):
    file_path: str

    def __init__(self, file_path: str) -> None:
        super().__init__()
        self.file_path = file_path

    @override
    def lazy_load(self) -> Iterator[Document]:
        loader = self.select_loader()

        return iter(
            tqdm(
                loader.lazy_load(),
                desc=f"Loading documents with {loader.__class__.__name__} by {self.__class__.__name__}",  # noqa: E501
            )
        )

    def select_loader(self) -> BaseLoader:
        _file_format = Path(self.file_path).suffix[1:]
        if _file_format not in get_args(SupportedFileFormat):
            raise ValueError(f"Unsupported file format: {_file_format}")

        file_format = cast(SupportedFileFormat, _file_format)

        match file_format:
            case "pdf":
                loader = PyPDFLoader(file_path=self.file_path)
            case "md" | "txt":
                loader = TextLoader(file_path=self.file_path)

        return loader
