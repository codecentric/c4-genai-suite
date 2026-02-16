# ruff: noqa: E501
from llm_eval.llm_endpoints.plugins.impl.azure_openai import (
    AzureOpenAILLMEndpointConfigurationCreate,
    AzureOpenAILLMEndpointConfigurationRead,
    AzureOpenAILLMEndpointConfigurationUpdate,
)
from llm_eval.llm_endpoints.plugins.impl.openai import (
    OpenAILLMEndpointConfigurationRead,
    OpenAILLMEndpointConfigurationCreate,
    OpenAILLMEndpointConfigurationUpdate,
)

type LLMEndpointConfigurationRead = (
    AzureOpenAILLMEndpointConfigurationRead
    | OpenAILLMEndpointConfigurationRead
)

type LLMEndpointConfigurationCreate = (
    AzureOpenAILLMEndpointConfigurationCreate
    | OpenAILLMEndpointConfigurationCreate
)

type LLMEndpointConfigurationUpdate = (
    AzureOpenAILLMEndpointConfigurationUpdate
    | OpenAILLMEndpointConfigurationUpdate
)
