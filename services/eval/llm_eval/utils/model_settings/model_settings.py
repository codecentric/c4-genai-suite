import abc

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel


class ModelSettings(abc.ABC):
    @abc.abstractmethod
    def to_chat(self) -> BaseChatModel:
        pass

    @abc.abstractmethod
    def to_embeddings(self) -> Embeddings:
        pass
