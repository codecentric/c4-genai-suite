from abc import ABC, abstractmethod
from typing import List

from langchain_core.documents import Document
from pydantic import BaseModel


class StoreFilter(BaseModel):
    bucket: str | None = None
    doc_ids: List[str] | None = None


class StoreAdapter(ABC):
    @abstractmethod
    def add_documents(self, documents: list[Document]) -> None:
        raise NotImplementedError

    @abstractmethod
    def delete(self, doc_id: str) -> None:
        raise NotImplementedError

    @abstractmethod
    def similarity_search(self, query: str, k: int = 4, search_filter: StoreFilter | None = None) -> List[Document]:
        raise NotImplementedError

    @abstractmethod
    def get_documents(self, ids: List[str]) -> List[Document]:
        raise NotImplementedError
