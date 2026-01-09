from threading import Lock
from typing import Awaitable, List

from langchain_core.documents import Document
from langchain_core.embeddings.embeddings import Embeddings
from langchain_community.vectorstores.azuresearch import AzureSearch
from azure.search.documents.indexes.models import (
    SearchableField,
    SearchField,
    SearchFieldDataType,
    SimpleField,
)

from rei_s.config import Config
from rei_s.services.vectorstore_adapter import VectorStoreAdapter, VectorStoreFilter


lock = Lock()


class AzureAISearchStoreAdapter(VectorStoreAdapter):
    vector_store: AzureSearch

    @classmethod
    def create(cls, config: Config, embeddings: Embeddings, index_name: str | None) -> "AzureAISearchStoreAdapter":
        if index_name is None:
            index_name = config.store_azure_ai_search_service_index_name
        if index_name is None:
            index_name = "index"

        # this is ensured by the config validation, the following lines are there to help the ty typechecker
        if config.store_azure_ai_search_service_endpoint is None:
            raise ValueError("The env variable `STORE_AZURE_AI_SEARCH_SERVICE_ENDPOINT` is missing.")
        if config.store_azure_ai_search_service_api_key is None:
            raise ValueError("The env variable `STORE_AZURE_AI_SEARCH_SERVICE_API_KEY` is missing.")

        # Apparently, we can not filter on metadata in the Python version of langchain
        # https://github.com/langchain-ai/langchain/issues/9261
        # so we have to configure new fields in the azure index, on which we want to filter.
        fields = [
            SimpleField(
                name="id",
                type=SearchFieldDataType.String,
                key=True,
                filterable=True,
            ),
            SearchableField(
                name="content",
                type=SearchFieldDataType.String,
                searchable=True,
            ),
            SearchField(
                name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=len(embeddings.embed_query("Text")),
                vector_search_profile_name="myHnswProfile",
            ),
            SearchableField(
                name="metadata",
                type=SearchFieldDataType.String,
                searchable=True,
            ),
            # Additional field for deleting by our id
            SearchableField(
                name="doc_id",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=True,
            ),
            # Additional field for filtering on bucket
            SearchableField(
                name="bucket",
                type=SearchFieldDataType.String,
                searchable=True,
                filterable=True,
            ),
        ]

        # We need to lock this, otherwise it two processes might race to create the same collection
        with lock:
            azure_vector_store = AzureSearch(
                azure_search_endpoint=config.store_azure_ai_search_service_endpoint,
                azure_search_key=config.store_azure_ai_search_service_api_key.get_secret_value(),
                index_name=index_name,
                embedding_function=embeddings,
                azure_ad_access_token=None,
                fields=fields,
            )

        instance = cls()

        instance.vector_store = azure_vector_store

        return instance

    def add_documents(self, documents: list[Document]) -> None:
        # langchain's abstraction of Azure AI seems to forget the ids and replaces them with the kwarg "key"
        # and langchains interface needs us to provide either no keys or keys for every document
        keys = [doc.id for doc in documents if doc.id is not None]
        if len(keys) > 0 and len(keys) != len(documents):
            raise ValueError("If you give an `id` for any document, you need to give an id for every document")
        self.vector_store.add_documents(documents, keys=keys)

    def delete(self, doc_id: str) -> None:
        # The `delete` method can only delete by the "key", which is unique, i.e., the chunk id.
        # To delete by our doc_id, we first need to fetch all chunk_ids of the doc_id.
        response = self.vector_store.client.search(search_text="*", filter=f"doc_id eq '{doc_id}'", select=["id"])
        # assure ty that we get the sync type
        if isinstance(response, Awaitable):
            raise TypeError("Got awaitable response from client. Expected sync Azure AI Search client")

        ids = [i["id"] for i in response]
        self.vector_store.delete(ids)

    @staticmethod
    def convert_filter(search_filter: VectorStoreFilter | None) -> str | None:
        if search_filter is None:
            filter_expression = None
        else:
            filter_expressions = []
            if search_filter.bucket is not None:
                filter_expressions.append(f"bucket eq '{search_filter.bucket}'")
            if search_filter.doc_ids is not None:
                if len(search_filter.doc_ids) == 0:
                    raise ValueError("The result would not match any entry")
                filter_expressions.append(f"search.in(doc_id, '{', '.join(search_filter.doc_ids)}')")
            filter_expression = " and ".join(filter_expressions)

        return filter_expression

    def similarity_search(
        self, query: str, k: int = 4, search_filter: VectorStoreFilter | None = None
    ) -> List[Document]:
        # We catch the special case of an empty file list. While None means that all files may be searched
        # an empty file list means that no files may be searched, such that the result will always be empty.
        # So we do not have to bother Azure.
        if search_filter is not None and search_filter.doc_ids is not None and len(search_filter.doc_ids) == 0:
            return []

        filter_expression = self.convert_filter(search_filter)

        return self.vector_store.similarity_search(query, k, filters=filter_expression)

    def get_documents(self, ids: List[str]) -> List[Document]:
        filter_query = f"search.in(id, '{', '.join(ids)}')"
        docs = self.vector_store.similarity_search("", len(ids), filters=filter_query)
        return docs
