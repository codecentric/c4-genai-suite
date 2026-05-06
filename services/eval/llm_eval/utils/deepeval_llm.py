import re
from typing import Type

from deepeval.models import DeepEvalBaseEmbeddingModel, DeepEvalBaseLLM
from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from openai import BadRequestError, RateLimitError
from pydantic import BaseModel

from llm_eval.settings import SETTINGS
from llm_eval.utils.decorators import async_retry_on_error, retry_on_error


class DeepEvalChatModel(DeepEvalBaseLLM):
    # noinspection PyMissingConstructor
    def __init__(self, model: BaseChatModel) -> None:
        self.model = model

    def load_model(self) -> BaseChatModel:
        return self.model

    @retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    def generate(
        self, prompt: str, schema: Type[BaseModel] | None = None
    ) -> BaseModel | str | None:
        chat_model = self.load_model()
        try:
            response = chat_model.invoke(prompt)
            if schema is None:
                return response.content if isinstance(response.content, str) else None
            if isinstance(response.content, str):
                return self.trim_and_load_model_from_json(response.content, schema)
            return None
        except BadRequestError:
            return None

    @async_retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    async def a_generate(
        self, prompt: str, schema: Type[BaseModel] | None = None
    ) -> BaseModel | str | None:
        chat_model = self.load_model()
        try:
            response = await chat_model.ainvoke(prompt)
            if schema is None:
                return response.content if isinstance(response.content, str) else None
            if isinstance(response.content, str):
                return self.trim_and_load_model_from_json(response.content, schema)
            return None
        except BadRequestError:
            return None

    @staticmethod
    def trim_and_load_model_from_json(
        input_string: str, schema: Type[BaseModel]
    ) -> BaseModel | None:
        start = input_string.find("{")
        end = input_string.rfind("}") + 1

        if end == 0 and start != -1:
            input_string = input_string + "}"
            end = len(input_string)

        json_str = input_string[start:end] if start != -1 and end != 0 else ""
        # Remove trailing comma if one is present
        json_str = re.sub(r",\s*([]}])", r"\1", json_str)

        try:
            return schema.model_validate_json(json_str)
        except Exception as e:
            raise Exception(f"An unexpected error occurred: {str(e)}")

    def get_model_name(self) -> str:
        return "Custom Deep Eval Chat Model"


class DeepEvalCustomEmbeddings(DeepEvalBaseEmbeddingModel):
    embeddings: Embeddings

    # noinspection PyMissingConstructor
    def __init__(self, embeddings: Embeddings) -> None:
        self.embeddings = embeddings

    def load_model(self) -> Embeddings:
        return self.embeddings

    @retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    def embed_text(self, text: str) -> list[float]:
        embedding_model = self.load_model()
        return embedding_model.embed_query(text)

    @retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    def embed_texts(self, texts: list[str]) -> list[list[float]]:
        embedding_model = self.load_model()
        return embedding_model.embed_documents(texts)

    @async_retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    async def a_embed_text(self, text: str) -> list[float]:
        embedding_model = self.load_model()
        return await embedding_model.aembed_query(text)

    @async_retry_on_error((RateLimitError,), SETTINGS.deepeval.max_retries)
    async def a_embed_texts(self, texts: list[str]) -> list[list[float]]:
        embedding_model = self.load_model()
        return await embedding_model.aembed_documents(texts)

    def get_model_name(self) -> str:
        return "Custom Deep Eval Embedding Model"
