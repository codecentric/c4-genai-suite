from threading import Lock
from typing import Any, Dict, List

from langchain_core.documents import Document
from langchain_postgres import PGVector
from langchain_core.embeddings.embeddings import Embeddings
from sqlalchemy import create_engine

from rei_s import logger
from rei_s.config import Config
from rei_s.services.vectorstore_adapter import VectorStoreAdapter, VectorStoreFilter


lock = Lock()

# Cache for vector store instances to prevent creating multiple connections
_vector_store_cache: Dict[str, PGVector] = {}


class PGVectorStoreAdapter(VectorStoreAdapter):
    vector_store: PGVector

    @classmethod
    def create(cls, config: Config, embeddings: Embeddings, index_name: str | None = None) -> "PGVectorStoreAdapter":
        if config.store_pgvector_url is None:
            raise ValueError("The env variable `STORE_PGVECTOR_URL` is missing.")

        collection_name = index_name
        if collection_name is None:
            collection_name = config.store_pgvector_index_name
        if collection_name is None:
            collection_name = "index"

        # Create a cache key based on connection URL and collection name
        cache_key = f"{config.store_pgvector_url}:{collection_name}"

        # In the python version the table name is hardcoded in langchain to `langchain_pg_collection`
        # https://github.com/langchain-ai/langchain/discussions/17223
        # We need to handle this via the collection name.

        # We need to lock this, otherwise it two processes might race to create the same collection
        with lock:
            # Check if we already have a vector store instance for this configuration
            if cache_key not in _vector_store_cache:
                engine = create_engine(
                    config.store_pgvector_url.get_secret_value(),
                    pool_size=5,
                    max_overflow=10,
                    pool_recycle=3600,
                )

                pg_vector_store = PGVector(
                    embeddings,
                    connection=engine,
                    collection_name=collection_name,
                    use_jsonb=True,
                )
                _vector_store_cache[cache_key] = pg_vector_store
            else:
                pg_vector_store = _vector_store_cache[cache_key]

        instance = cls()

        instance.vector_store = pg_vector_store

        return instance

    def add_documents(self, documents: list[Document]) -> None:
        self.vector_store.add_documents(documents)

    def delete(self, doc_id: str) -> None:
        # The vector store does not offer a method to delete chunks by metadata (only chunk id), thus
        # we do it ourselves by calling SQLAlchemy directly using the protected `_make_sync_session` method.
        from sqlalchemy import delete

        with self.vector_store._make_sync_session() as session:
            stmt = delete(self.vector_store.EmbeddingStore)

            collection = self.vector_store.get_collection(session)
            if not collection:
                logger.warning("Collection not found")
                return

            stmt = stmt.where(self.vector_store.EmbeddingStore.collection_id == collection.uuid)

            stmt = stmt.filter(self.vector_store.EmbeddingStore.cmetadata["doc_id"].astext == doc_id)
            session.execute(stmt)
            session.commit()

    @staticmethod
    def convert_filter(search_filter: VectorStoreFilter | None) -> Dict[str, Any] | None:
        filter_dict: Dict[str, Any] | None
        if search_filter is None:
            filter_dict = None
        else:
            filter_dict = {}
            if search_filter.bucket is not None:
                filter_dict["bucket"] = {"$eq": search_filter.bucket}
            if search_filter.doc_ids is not None:
                filter_dict["doc_id"] = {"$in": search_filter.doc_ids}

        return filter_dict

    def similarity_search(
        self, query: str, k: int = 4, search_filter: VectorStoreFilter | None = None
    ) -> List[Document]:
        filter_dict = self.convert_filter(search_filter)

        return self.vector_store.similarity_search(query, k, filter_dict)

    def get_documents(self, ids: List[str]) -> List[Document]:
        return self.vector_store.get_by_ids(ids)
