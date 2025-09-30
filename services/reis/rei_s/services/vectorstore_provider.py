from langchain_core.embeddings.embeddings import Embeddings

from rei_s.config import Config
from rei_s.services.vectorstore_adapter import VectorStoreAdapter
from rei_s.services.vectorstores.azure_ai_search import AzureAISearchStoreAdapter
from rei_s.services.vectorstores.devnull_store import DevNullStoreAdapter
from rei_s.services.vectorstores.pgvector import PGVectorStoreAdapter


def get_vectorstore(
    config: Config,
    embeddings: Embeddings,
    index_name: str | None,
) -> VectorStoreAdapter:
    if config.store_type == "pgvector":
        return PGVectorStoreAdapter.create(config=config, embeddings=embeddings, index_name=index_name)
    elif config.store_type == "azure-ai-search":
        return AzureAISearchStoreAdapter.create(config=config, embeddings=embeddings, index_name=index_name)
    elif config.store_type == "dev-null":
        return DevNullStoreAdapter.create(config=config, embeddings=embeddings, index_name=index_name)
    else:
        raise ValueError(f"Store type {config.store_type} not supported")
