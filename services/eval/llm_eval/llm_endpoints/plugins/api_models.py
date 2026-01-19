# ruff: noqa: E501
from llm_eval.llm_endpoints.plugins.impl.azure_openai import (
    AzureOpenAILLMEndpointConfigurationCreate,
    AzureOpenAILLMEndpointConfigurationRead,
    AzureOpenAILLMEndpointConfigurationUpdate,
)
from llm_eval.llm_endpoints.plugins.impl.c4 import (
    C4LLMEndpointConfigurationCreate,
    C4LLMEndpointConfigurationRead,
    C4LLMEndpointConfigurationUpdate,
)
from llm_eval.llm_endpoints.plugins.impl.openai import (
    OpenAILLMEndpointConfigurationRead,
    OpenAILLMEndpointConfigurationCreate,
    OpenAILLMEndpointConfigurationUpdate,
)

type LLMEndpointConfigurationRead = (
    C4LLMEndpointConfigurationRead
    | AzureOpenAILLMEndpointConfigurationRead
    | OpenAILLMEndpointConfigurationRead
)

type LLMEndpointConfigurationCreate = (
    C4LLMEndpointConfigurationCreate
    | AzureOpenAILLMEndpointConfigurationCreate
    | OpenAILLMEndpointConfigurationCreate
)

type LLMEndpointConfigurationUpdate = (
    C4LLMEndpointConfigurationUpdate
    | AzureOpenAILLMEndpointConfigurationUpdate
    | OpenAILLMEndpointConfigurationUpdate
)
