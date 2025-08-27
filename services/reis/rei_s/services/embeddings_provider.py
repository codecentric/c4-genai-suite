from langchain_openai import OpenAIEmbeddings, AzureOpenAIEmbeddings
from langchain_community.embeddings import FakeEmbeddings
from langchain_ollama import OllamaEmbeddings
from langchain_core.embeddings import Embeddings
from langchain_aws.embeddings.bedrock import BedrockEmbeddings
from rei_s.config import Config


def get_embeddings(config: Config) -> Embeddings:
    # for low tier subscriptions, we will encounter rate limits when uploading larger files
    # since we may have multiple workers using the same embedding endpoint, we will encounter
    # multiple triggers of the rate limit error. However, we do not want to fail after
    # the default 2 retries. Thus we use a ridiculous number of retries to insure slow but errorless
    # uploads in instances with a too cheap subscription tier.
    max_retries = 1337

    if config.embeddings_type.lower() == "openai":
        # this is ensured by the config validation, the following lines are there to help the mypy typechecker
        if config.embeddings_openai_model_name is None:
            raise ValueError("The env variable `EMBEDDINGS_OPENAI_MODEL_NAME` is missing.")

        return OpenAIEmbeddings(
            api_key=config.embeddings_openai_api_key,
            model=config.embeddings_openai_model_name,
            max_retries=max_retries,
            base_url=config.embeddings_openai_endpoint,
        )
    elif config.embeddings_type.lower() == "ollama":
        # this is ensured by the config validation, the following lines are there to help the mypy typechecker
        if config.embeddings_ollama_model_name is None:
            raise ValueError("The env variable `EMBEDDINGS_OLLAMA_MODEL_NAME` is missing.")
        if config.embeddings_ollama_endpoint is None:
            raise ValueError("The env variable `EMBEDDINGS_OLLAMA_ENDPOINT` is missing.")

        return OllamaEmbeddings(
            model=config.embeddings_ollama_model_name,
            base_url=config.embeddings_ollama_endpoint,
        )
    elif config.embeddings_type.lower() == "azure-openai":
        # this is ensured by the config validation, the following lines are there to help the mypy typechecker
        if config.embeddings_azure_openai_model_name is None:
            raise ValueError("The env variable `EMBEDDINGS_AZURE_OPENAI_MODEL_NAME` is missing.")

        return AzureOpenAIEmbeddings(
            api_key=config.embeddings_azure_openai_api_key,
            model=config.embeddings_azure_openai_model_name,
            azure_deployment=config.embeddings_azure_openai_deployment_name,
            azure_endpoint=config.embeddings_azure_openai_endpoint,
            api_version=config.embeddings_azure_openai_api_version,
            max_retries=max_retries,
        )
    elif config.embeddings_type.lower() == "bedrock":
        if config.embeddings_bedrock_region_name is None:
            raise ValueError("The env variable `EMBEDDINGS_BEDROCK_REGION_NAME` is missing.")
        if config.embeddings_bedrock_model_id is None:
            raise ValueError("The env variable `EMBEDDINGS_BEDROCK_MODEL_ID` is missing.")
        if config.embeddings_bedrock_aws_access_key_id is None:
            raise ValueError("The env variable `EMBEDDINGS_BEDROCK_AWS_ACCESS_KEY_ID` is missing.")
        if config.embeddings_bedrock_aws_secret_access_key is None:
            raise ValueError("The env variable `EMBEDDINGS_BEDROCK_AWS_SECRET_ACCESS_KEY` is missing.")

        return BedrockEmbeddings(
            model_id=config.embeddings_bedrock_model_id,
            aws_access_key_id=config.embeddings_bedrock_aws_access_key_id,
            aws_secret_access_key=config.embeddings_bedrock_aws_secret_access_key,
            region_name=config.embeddings_bedrock_region_name,
        )
    elif config.embeddings_type.lower() == "random-test-embeddings":
        # use text-embedding-3-large size, which is at the time of writing the
        # largest model used in dev or prod
        return FakeEmbeddings(size=3072)
    else:
        raise ValueError(f"Unknown embedding type: {config.embeddings_type}")
