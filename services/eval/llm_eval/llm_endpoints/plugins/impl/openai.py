from typing import Literal, get_args

from langchain_core.language_models import BaseChatModel
from langchain_openai import ChatOpenAI
from pydantic import SecretStr

from llm_eval.llm_endpoints.plugins.impl.language_support import (
    Language,
    create_chat_model_with_language_support,
)
from llm_eval.llm_endpoints.plugins.interface import (
    BaseConfiguration,
    BaseConfigurationCreate,
    BaseConfigurationRead,
    BaseConfigurationUpdate,
    ChatModelSupport,
    LLMEndpointPlugin,
    LLMQuerySupport,
    Unset,
    get_update_value,
)
from llm_eval.llm_query.chat_model_query import ChatModelQuery
from llm_eval.llm_query.interface import (
    LLMQuery,
)
from llm_eval.utils.encrypter import decrypt, encrypt
from llm_eval.utils.json_types import JSONObject

EndpointType = Literal["OPENAI"]

ENDPOINT_TYPE: EndpointType = get_args(EndpointType)[0]


class OpenAILLMEndpointConfiguration(BaseConfiguration[EndpointType]):
    base_url: str | None
    api_key: str
    model: str
    temperature: float | None
    request_timeout: int
    language: Language | None = None

    def to_db_json(self) -> JSONObject:
        return self.model_copy(update={"api_key": encrypt(self.api_key)}).model_dump()


class OpenAILLMEndpointConfigurationRead(BaseConfigurationRead[EndpointType]):
    base_url: str | None
    model: str
    temperature: float | None
    request_timeout: int
    language: Language | None


class OpenAILLMEndpointConfigurationCreate(BaseConfigurationCreate[EndpointType]):
    base_url: str | None
    api_key: str
    model: str
    temperature: float | None
    request_timeout: int
    language: Language | None


class OpenAILLMEndpointConfigurationUpdate(BaseConfigurationUpdate[EndpointType]):
    base_url: str | Unset | None = None
    api_key: str | None = None
    model: str | None = None
    temperature: float | Unset | None = None
    request_timeout: int | None = None
    language: Language | Unset | None = None


class OpenAILLMEndpointPlugin(
    LLMEndpointPlugin[
        EndpointType,
        OpenAILLMEndpointConfiguration,
        OpenAILLMEndpointConfigurationRead,
        OpenAILLMEndpointConfigurationCreate,
        OpenAILLMEndpointConfigurationUpdate,
    ],
    ChatModelSupport[OpenAILLMEndpointConfiguration],
    LLMQuerySupport[OpenAILLMEndpointConfiguration],
):
    def __init__(self) -> None:
        super().__init__(ENDPOINT_TYPE)

    def configuration_from_db_json(
        self, json: JSONObject
    ) -> OpenAILLMEndpointConfiguration:
        configuration = OpenAILLMEndpointConfiguration.model_validate(json)
        return configuration.model_copy(
            update={"api_key": decrypt(configuration.api_key)}
        )

    def configuration_from_create_data(
        self, create_configuration: OpenAILLMEndpointConfigurationCreate
    ) -> OpenAILLMEndpointConfiguration:
        return OpenAILLMEndpointConfiguration.model_validate(
            create_configuration.model_dump()
        )

    def create_read_model_from_configuration(
        self, configuration: OpenAILLMEndpointConfiguration
    ) -> OpenAILLMEndpointConfigurationRead:
        return OpenAILLMEndpointConfigurationRead.model_validate(configuration)

    def update_configuration(
        self,
        configuration: OpenAILLMEndpointConfiguration,
        update_configuration: OpenAILLMEndpointConfigurationUpdate,
    ) -> OpenAILLMEndpointConfiguration:
        return (
            super()
            .update_configuration(configuration, update_configuration)
            .model_copy(
                update={
                    "base_url": get_update_value(
                        update_configuration.base_url, configuration.base_url
                    ),
                    "api_key": get_update_value(
                        update_configuration.api_key, configuration.api_key
                    ),
                    "model": get_update_value(
                        update_configuration.model, configuration.model
                    ),
                    "temperature": get_update_value(
                        update_configuration.temperature, configuration.temperature
                    ),
                    "request_timeout": get_update_value(
                        update_configuration.request_timeout,
                        configuration.request_timeout,
                    ),
                    "language": get_update_value(
                        update_configuration.language,
                        configuration.language,
                    ),
                }
            )
        )

    def create_chat_model(
        self, configuration: OpenAILLMEndpointConfiguration
    ) -> BaseChatModel:
        kwargs = {
            "base_url": configuration.base_url,
            "model": configuration.model,
            "temperature": (
                configuration.temperature
                if configuration.temperature is not None
                else 0.7
            ),
            "api_key": SecretStr(configuration.api_key),
            "timeout": float(configuration.request_timeout),
        }
        if configuration.language:
            return create_chat_model_with_language_support(ChatOpenAI)(
                language=configuration.language,
                **kwargs,
            )
        return ChatOpenAI(**kwargs)

    def create_llm_query(
        self, configuration: OpenAILLMEndpointConfiguration
    ) -> LLMQuery:
        return ChatModelQuery(
            parallel_queries=configuration.parallel_queries,
            chat_model=self.create_chat_model(configuration),
            model=configuration.model,
        )
