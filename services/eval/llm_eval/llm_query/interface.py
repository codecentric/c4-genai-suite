from abc import ABC, abstractmethod

from pydantic.dataclasses import dataclass

from llm_eval.utils.json_types import JSONObject


@dataclass
class LLMConfiguration:
    id: str
    name: str | None
    version: str


@dataclass
class LLMQueryResult:
    configuration: LLMConfiguration
    answer: str
    retrieval_context: list[str] | None


class LLMQuery(ABC):
    parallel_queries: int

    def __init__(self, parallel_queries: int) -> None:
        self.parallel_queries = parallel_queries

    @abstractmethod
    async def query(self, prompt: str, meta_data: JSONObject) -> LLMQueryResult:
        pass
