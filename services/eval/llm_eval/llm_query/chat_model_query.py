from langchain_core.language_models import BaseChatModel
from langchain_core.output_parsers import StrOutputParser

from llm_eval.llm_query.interface import (
    LLMConfiguration,
    LLMQuery,
    LLMQueryResult,
)
from llm_eval.utils.json_types import JSONObject


class ChatModelQuery(LLMQuery):
    def __init__(
        self,
        parallel_queries: int,
        chat_model: BaseChatModel,
        model: str,
        version: str | None = None,
    ) -> None:
        super().__init__(parallel_queries)

        self.chat_model = chat_model
        self.model = model
        self.version = version

    async def query(self, prompt: str, meta_data: JSONObject) -> LLMQueryResult:
        chain = self.chat_model | StrOutputParser()

        result = chain.invoke(prompt)

        return LLMQueryResult(
            configuration=LLMConfiguration(
                id="0",
                name=self.model,
                version=self.version if self.version is not None else "-",
            ),
            answer=result,
            retrieval_context=None,
        )
