from typing import Literal, get_args, override

from langchain_core.language_models import BaseChatModel
from langchain_openai import AzureChatOpenAI
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
from llm_eval.llm_query.interface import LLMQuery
from llm_eval.utils.encrypter import decrypt, encrypt
from llm_eval.utils.json_types import JSONObject

EndpointType = Literal["AZURE_OPENAI"]

ENDPOINT_TYPE: EndpointType = get_args(EndpointType)[0]


class AzureOpenAILLMEndpointConfiguration(
    BaseConfiguration[EndpointType],
):
    endpoint: str
    api_key: str
    api_version: str
    deployment: str
    request_timeout: int = 60
    language: Language | None = None

    def to_db_json(self) -> JSONObject:
        return self.model_copy(update={"api_key": encrypt(self.api_key)}).model_dump()


class AzureOpenAILLMEndpointConfigurationRead(BaseConfigurationRead[EndpointType]):
    endpoint: str
    api_version: str
    deployment: str
    request_timeout: int
    language: Language | None


class AzureOpenAILLMEndpointConfigurationCreate(BaseConfigurationCreate[EndpointType]):
    endpoint: str
    api_key: str
    api_version: str
    deployment: str
    request_timeout: int
    language: Language | None


class AzureOpenAILLMEndpointConfigurationUpdate(BaseConfigurationUpdate[EndpointType]):
    endpoint: str | None = None
    api_key: str | None = None
    api_version: str | None = None
    deployment: str | None = None
    request_timeout: int | None = None
    language: Language | Unset | None = None


class AzureOpenAILLMEndpointPlugin(
    LLMEndpointPlugin[
        EndpointType,
        AzureOpenAILLMEndpointConfiguration,
        AzureOpenAILLMEndpointConfigurationRead,
        AzureOpenAILLMEndpointConfigurationCreate,
        AzureOpenAILLMEndpointConfigurationUpdate,
    ],
    ChatModelSupport[AzureOpenAILLMEndpointConfiguration],
    LLMQuerySupport[AzureOpenAILLMEndpointConfiguration],
):
    def __init__(self) -> None:
        super().__init__(ENDPOINT_TYPE)

    def configuration_from_db_json(
        self, json: JSONObject
    ) -> AzureOpenAILLMEndpointConfiguration:
        configuration = AzureOpenAILLMEndpointConfiguration.model_validate(json)
        return configuration.model_copy(
            update={"api_key": decrypt(configuration.api_key)}
        )

    def configuration_from_create_data(
        self, create_configuration: AzureOpenAILLMEndpointConfigurationCreate
    ) -> AzureOpenAILLMEndpointConfiguration:
        return AzureOpenAILLMEndpointConfiguration.model_validate(
            create_configuration.model_dump()
        )

    def create_read_model_from_configuration(
        self, configuration: AzureOpenAILLMEndpointConfiguration
    ) -> AzureOpenAILLMEndpointConfigurationRead:
        return AzureOpenAILLMEndpointConfigurationRead.model_validate(configuration)

    def update_configuration(
        self,
        configuration: AzureOpenAILLMEndpointConfiguration,
        update_configuration: AzureOpenAILLMEndpointConfigurationUpdate,
    ) -> AzureOpenAILLMEndpointConfiguration:
        return (
            super()
            .update_configuration(configuration, update_configuration)
            .model_copy(
                update={
                    "endpoint": get_update_value(
                        update_configuration.endpoint, configuration.endpoint
                    ),
                    "api_key": get_update_value(
                        update_configuration.api_key, configuration.api_key
                    ),
                    "api_version": get_update_value(
                        update_configuration.api_version, configuration.api_version
                    ),
                    "deployment": get_update_value(
                        update_configuration.deployment, configuration.deployment
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

    @override
    def create_chat_model(
        self, configuration: AzureOpenAILLMEndpointConfiguration
    ) -> BaseChatModel:
        kwargs = {
            "api_version": configuration.api_version,
            "azure_deployment": configuration.deployment,
            "azure_endpoint": configuration.endpoint,
            "api_key": SecretStr(configuration.api_key),
            "timeout": float(configuration.request_timeout),
        }
        if configuration.language:
            return create_chat_model_with_language_support(AzureChatOpenAI)(
                language=configuration.language,
                **kwargs,
            )
        else:
            return AzureChatOpenAI(**kwargs)

    def create_llm_query(
        self, configuration: AzureOpenAILLMEndpointConfiguration
    ) -> LLMQuery:
        return ChatModelQuery(
            parallel_queries=configuration.parallel_queries,
            chat_model=self.create_chat_model(configuration),
            model=configuration.deployment,
            version=configuration.api_version,
        )
