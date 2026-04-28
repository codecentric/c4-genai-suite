from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_openai import AzureChatOpenAI, AzureOpenAIEmbeddings
from pydantic import Field, SecretStr

from llm_eval.settings import BaseSettings
from llm_eval.utils.model_settings.model_settings import ModelSettings


class AzureAiModelSettings(BaseSettings, ModelSettings, prefix="AZURE_OPENAI_"):
    api_version: str = Field(default="2024-02-01")
    endpoint: str = Field(default="https://example.com")
    api_key: str = Field(default="api-key")
    embedding_deployment: str = Field(default="text-embedding-3-large")
    chat_deployment: str = Field(default="gpt-4.1")
    response_language: str = Field(default="german")

    def to_chat(self) -> BaseChatModel:
        return AzureChatOpenAI(
            api_version=self.api_version,
            azure_deployment=self.chat_deployment,
            azure_endpoint=self.endpoint,
            api_key=SecretStr(self.api_key),
        )

    def to_embeddings(self) -> Embeddings:
        return AzureOpenAIEmbeddings(
            api_version=self.api_version,
            azure_deployment=self.embedding_deployment,
            azure_endpoint=self.endpoint,
            api_key=SecretStr(self.api_key),
        )
