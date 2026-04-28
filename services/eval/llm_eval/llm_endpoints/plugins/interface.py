import abc
import enum
from typing import Literal, get_args

from langchain_core.language_models import BaseChatModel
from pydantic import BaseModel

from llm_eval.llm_query.interface import LLMQuery
from llm_eval.schemas import ApiModel
from llm_eval.utils.json_types import JSONObject

Unset = Literal["UNSET_VALUE"]


def get_update_value[V](
    update_value: V | Unset | None, existing_value: V | None
) -> V | None:
    if update_value == get_args(Unset)[0]:
        return None
    elif update_value is None:
        return existing_value
    else:
        return update_value


class PluginFeature(enum.StrEnum):
    LLM_QUERY = "LLM_QUERY"
    CHAT_MODEL = "CHAT_MODEL"


class BaseConfiguration[EndpointType: str](BaseModel):
    type: EndpointType
    parallel_queries: int
    max_retries: int

    def to_db_json(self) -> JSONObject:
        return self.model_dump()


class BaseConfigurationRead[EndpointType: str](ApiModel):
    type: EndpointType
    parallel_queries: int
    max_retries: int


class BaseConfigurationCreate[EndpointType: str](ApiModel):
    type: EndpointType
    parallel_queries: int
    max_retries: int


class BaseConfigurationUpdate[EndpointType: str](ApiModel):
    type: EndpointType
    parallel_queries: int | None = None
    max_retries: int | None = None


class LLMEndpointPlugin[
    EndpointType: str,
    Configuration: BaseConfiguration,
    ConfigurationRead: BaseConfigurationRead,
    ConfigurationCreate: BaseConfigurationCreate,
    ConfigurationUpdate: BaseConfigurationUpdate,
](abc.ABC):
    endpoint_type: EndpointType

    def __init__(self, endpoint_type: EndpointType) -> None:
        self.endpoint_type = endpoint_type

    @abc.abstractmethod
    def configuration_from_db_json(self, json: JSONObject) -> Configuration: ...

    @abc.abstractmethod
    def configuration_from_create_data(
        self, create_configuration: ConfigurationCreate
    ) -> Configuration: ...

    @abc.abstractmethod
    def update_configuration(
        self, configuration: Configuration, update_configuration: ConfigurationUpdate
    ) -> Configuration:
        return configuration.model_copy(
            update={
                "parallel_queries": get_update_value(
                    update_configuration.parallel_queries,
                    configuration.parallel_queries,
                ),
                "max_retries": get_update_value(
                    update_configuration.max_retries, configuration.max_retries
                ),
            }
        )

    @abc.abstractmethod
    def create_read_model_from_configuration(
        self, configuration: Configuration
    ) -> ConfigurationRead: ...

    def get_supported_features(self) -> list[PluginFeature]:
        features: list[PluginFeature] = []

        if isinstance(self, LLMQuerySupport):
            features.append(PluginFeature.LLM_QUERY)

        if isinstance(self, ChatModelSupport):
            features.append(PluginFeature.CHAT_MODEL)

        return features


class LLMQuerySupport[Configuration: BaseConfiguration](abc.ABC):
    @abc.abstractmethod
    def create_llm_query(self, configuration: Configuration) -> LLMQuery: ...


class ChatModelSupport[Configuration: BaseConfiguration](abc.ABC):
    @abc.abstractmethod
    def create_chat_model(self, configuration: Configuration) -> BaseChatModel: ...
