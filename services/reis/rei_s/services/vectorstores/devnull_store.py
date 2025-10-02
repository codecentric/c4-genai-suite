from typing import List
from langchain_core.documents import Document
from langchain_core.embeddings.embeddings import Embeddings

from rei_s.config import Config
from rei_s.services.vectorstore_adapter import VectorStoreAdapter, VectorStoreFilter


class DevNullVectorStoreAdapter(VectorStoreAdapter):
    vector_store: None

    @classmethod
    def create(
        cls, config: Config, embeddings: Embeddings, index_name: str | None = None
    ) -> "DevNullVectorStoreAdapter":
        return cls()

    def add_documents(self, documents: list[Document]) -> None:
        pass

    def delete(self, doc_id: str) -> None:
        pass

    def similarity_search(
        self, query: str, k: int = 4, search_filter: VectorStoreFilter | None = None
    ) -> List[Document]:
        return []

    def get_documents(self, ids: List[str]) -> List[Document]:
        return []
