from abc import ABC
from enum import StrEnum
from typing import Any, Iterator, List, Optional, cast, override

from langchain_core.callbacks import (
    AsyncCallbackManagerForLLMRun,
    CallbackManagerForLLMRun,
)
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import BaseMessage
from langchain_core.outputs import ChatGenerationChunk, ChatResult


class CustomChatModel(BaseChatModel):
    """Custom Azure OpenAI chat model with prompt modification capability."""

    def _modify_message(self, msg: BaseMessage) -> BaseMessage:
        return msg

    async def _agenerate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        messages = list(map(self._modify_message, messages))
        return await super()._agenerate(messages, stop, run_manager, **kwargs)

    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> ChatResult:
        messages = list(map(self._modify_message, messages))
        return super()._generate(messages, stop, run_manager, **kwargs)

    def _stream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[CallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Iterator[ChatGenerationChunk]:
        messages = list(map(self._modify_message, messages))
        return super()._stream(messages, stop, run_manager, **kwargs)

    def _astream(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[AsyncCallbackManagerForLLMRun] = None,
        **kwargs: Any,
    ) -> Any:  # type: ignore  # noqa: ANN401
        messages = list(map(self._modify_message, messages))
        yield super()._astream(messages, stop, run_manager, **kwargs)


class Language(StrEnum):
    ENGLISH = "english"
    GERMAN = "german"


class CustomChatModelWithLanguageSupport(CustomChatModel, ABC):
    language: Language


def create_chat_model_with_language_support(
    Subclass: type[BaseChatModel],
) -> type[CustomChatModelWithLanguageSupport]:
    class _CustomChatModelWithLanguageSupport(CustomChatModel, Subclass):
        language: Language

        @override
        def _modify_message(self, msg: BaseMessage) -> BaseMessage:
            msg.content = f"{msg.content}\nYour response should always be in {self.language.value}, even this contradicts with what said previously."  # noqa: E501
            return msg

    return cast(
        type[CustomChatModelWithLanguageSupport], _CustomChatModelWithLanguageSupport
    )
