from typing import Literal, get_args

from llm_eval.llm_endpoints.plugins.interface import (
    BaseConfiguration,
    BaseConfigurationCreate,
    BaseConfigurationRead,
    BaseConfigurationUpdate,
    LLMEndpointPlugin,
    LLMQuerySupport,
    get_update_value,
)
from llm_eval.llm_query.c4_query import C4Query
from llm_eval.llm_query.interface import LLMQuery
from llm_eval.utils.encrypter import decrypt, encrypt
from llm_eval.utils.json_types import JSONObject

EndpointType = Literal["C4"]

ENDPOINT_TYPE: EndpointType = get_args(EndpointType)[0]


class C4LLMEndpointConfiguration(BaseConfiguration[EndpointType]):
    endpoint: str
    configuration_id: int
    api_key: str
    request_timeout: int = 60

    def to_db_json(self) -> JSONObject:
        return self.model_copy(update={"api_key": encrypt(self.api_key)}).model_dump()


class C4LLMEndpointConfigurationRead(BaseConfigurationRead[EndpointType]):
    endpoint: str
    configuration_id: int
    request_timeout: int


class C4LLMEndpointConfigurationCreate(BaseConfigurationCreate[EndpointType]):
    endpoint: str
    configuration_id: int
    api_key: str
    request_timeout: int


class C4LLMEndpointConfigurationUpdate(BaseConfigurationUpdate[EndpointType]):
    endpoint: str | None = None
    api_key: str | None = None
    configuration_id: int | None = None
    request_timeout: int | None = None


class C4LLMEndpointPlugin(
    LLMEndpointPlugin[
        EndpointType,
        C4LLMEndpointConfiguration,
        C4LLMEndpointConfigurationRead,
        C4LLMEndpointConfigurationCreate,
        C4LLMEndpointConfigurationUpdate,
    ],
    LLMQuerySupport[C4LLMEndpointConfiguration],
):
    def __init__(self) -> None:
        super().__init__(ENDPOINT_TYPE)

    def configuration_from_db_json(
        self, json: JSONObject
    ) -> C4LLMEndpointConfiguration:
        configuration = C4LLMEndpointConfiguration.model_validate(json)
        return configuration.model_copy(
            update={"api_key": decrypt(configuration.api_key)}
        )

    def configuration_from_create_data(
        self, create_configuration: C4LLMEndpointConfigurationCreate
    ) -> C4LLMEndpointConfiguration:
        return C4LLMEndpointConfiguration.model_validate(
            create_configuration.model_dump()
        )

    def create_read_model_from_configuration(
        self, configuration: C4LLMEndpointConfiguration
    ) -> C4LLMEndpointConfigurationRead:
        return C4LLMEndpointConfigurationRead.model_validate(configuration)

    def update_configuration(
        self,
        configuration: C4LLMEndpointConfiguration,
        update_configuration: C4LLMEndpointConfigurationUpdate,
    ) -> C4LLMEndpointConfiguration:
        return (
            super()
            .update_configuration(configuration, update_configuration)
            .model_copy(
                update={
                    "endpoint": get_update_value(
                        update_configuration.endpoint, configuration.endpoint
                    ),
                    "configuration_id": get_update_value(
                        update_configuration.configuration_id,
                        configuration.configuration_id,
                    ),
                    "api_key": get_update_value(
                        update_configuration.api_key, configuration.api_key
                    ),
                    "request_timeout": get_update_value(
                        update_configuration.request_timeout,
                        configuration.request_timeout,
                    ),
                }
            )
        )

    def create_llm_query(self, configuration: C4LLMEndpointConfiguration) -> LLMQuery:
        return C4Query(
            endpoint=configuration.endpoint,
            api_key=configuration.api_key,
            configuration_id=configuration.configuration_id,
            parallel_queries=configuration.parallel_queries,
            max_retries=configuration.max_retries,
            timeout=configuration.request_timeout,
        )
