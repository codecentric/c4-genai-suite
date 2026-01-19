# ruff: noqa: E501
from typing import overload

from llm_eval.database.model import LLMEndpoint
from llm_eval.llm_endpoints.plugins.impl.azure_openai import (
    AzureOpenAILLMEndpointPlugin,
)
from llm_eval.llm_endpoints.plugins.impl.c4 import C4LLMEndpointPlugin
from llm_eval.llm_endpoints.plugins.impl.openai import (
    OpenAILLMEndpointPlugin,
)
from llm_eval.llm_endpoints.plugins.interface import (
    BaseConfiguration,
    LLMEndpointPlugin,
)

plugins: list[LLMEndpointPlugin] = [
    C4LLMEndpointPlugin(),
    AzureOpenAILLMEndpointPlugin(),
    OpenAILLMEndpointPlugin(),
]


@overload
def get_endpoint_plugin(llm_endpoint: LLMEndpoint) -> LLMEndpointPlugin: ...


@overload
def get_endpoint_plugin(endpoint_type: str) -> LLMEndpointPlugin: ...


def get_endpoint_plugin(endpoint: str | LLMEndpoint) -> LLMEndpointPlugin:
    if isinstance(endpoint, LLMEndpoint):
        base_config = BaseConfiguration.model_validate(endpoint.endpoint_config)

        endpoint_type = base_config.type
    else:
        endpoint_type = endpoint

    plugin = next(
        (plugin for plugin in plugins if plugin.endpoint_type == endpoint_type), None
    )

    if plugin is None:
        raise ValueError(f"No plugin found for endpoint type {endpoint_type}.")

    return plugin
