from functools import lru_cache
import json
import os
import re
import tempfile
from typing import Annotated, Literal, Mapping, Self

from pydantic import Field, SecretStr, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from rei_s import logger


# global settings only evaluated at program start
# This is the global variable, which determines, where python will create tempfiles.
# Since we have no direct control, where dependencies might create their temporary files,
# we manipulate Python's tempfile.
# Also our direct use of temp files uses the `tempfile` module, such that they are handled as well.
# If `TMP_FILES_ROOT` is not set, the default is used (`/tmp` in most cases).
# see also: https://python.readthedocs.io/en/latest/library/tempfile.html#tempfile.tempdir
def update_tempdir() -> None:
    tempfile.tempdir = os.getenv("TMP_FILES_ROOT")


update_tempdir()


def check_needed(needed: Mapping[str, str | SecretStr | None], switch_name: str, switch_value: str) -> None:
    missing = []
    for name, value in needed.items():
        if value is None:
            missing.append(name)

    if missing:
        raise ValueError(
            f'With {switch_name} == "{switch_value}": {", ".join(missing)} is/are required but was/were not given.'
        )


def check_valid_postgres_connection_string(postgres_connection_string: SecretStr | None) -> None:
    if postgres_connection_string is None:
        raise ValueError("STORE_PGVECTOR_URL is mandatory")
    val = postgres_connection_string.get_secret_value()
    if not re.match(r"^(?:postgres(?:ql)?\+psycopg)://", val):
        raise ValueError(
            "The STORE_PGVECTOR_URL must start with `postgresql+psycopg://`. "
            "It is important that the dialect `psycopg` is specified in the connection string."
        )


def check_valid_s3_bucket_name(bucket_name: str | None) -> None:
    if bucket_name is None:
        raise ValueError("FILE_STORE_S3_BUCKET_NAME is mandatory")

    if not (3 <= len(bucket_name) <= 63):
        raise ValueError("FILE_STORE_S3_BUCKET_NAME needs to have 3 to 63 characters")

    if not re.match(r"^[a-z0-9]([a-z0-9\.-]*[a-z0-9])?$", bucket_name):
        raise ValueError(
            "FILE_STORE_S3_BUCKET_NAME must only contain lowercase letters, numbers, dots, and hyphens "
            "and start with and start with a letter or number"
        )

    if ".." in bucket_name or ".-" in bucket_name or "-." in bucket_name:
        raise ValueError("FILE_STORE_S3_BUCKET_NAME cannot have dots adjacent to hyphens or double dots")

    if re.match(r"^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$", bucket_name):
        raise ValueError("FILE_STORE_S3_BUCKET_NAME cannot be formatted like an IP address")


# will be fixed in next mypy release
# TODO: remove `type: ignore` when mypy was updated
class Config(BaseSettings, frozen=True):  # type: ignore
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True)

    workers: Annotated[int, Field(gt=0)] = 1
    metrics_port: Annotated[int, Field(ge=0)] = 9200
    batch_size: Annotated[int, Field(gt=0)] | None = None
    filesize_threshold: Annotated[int, Field(gt=0)] = 10**5

    embeddings_type: Literal["azure-openai", "openai", "random-test-embeddings", "ollama", "bedrock", "nvidia"]
    # needed for Azure OpenAI
    embeddings_azure_openai_endpoint: str | None = None
    embeddings_azure_openai_api_key: SecretStr | None = None
    embeddings_azure_openai_api_version: str | None = None
    embeddings_azure_openai_model_name: str | None = None
    embeddings_azure_openai_deployment_name: str | None = None
    # needed for Bedrock
    embeddings_bedrock_model_id: str | None = None
    embeddings_bedrock_aws_access_key_id: SecretStr | None = None
    embeddings_bedrock_aws_secret_access_key: SecretStr | None = None
    embeddings_bedrock_region_name: str | None = None
    # needed for OpenAI
    embeddings_openai_endpoint: str | None = None
    embeddings_openai_api_key: SecretStr | None = None
    embeddings_openai_model_name: str | None = None
    # needed for ollama
    embeddings_ollama_endpoint: str | None = None
    embeddings_ollama_model_name: str | None = None
    # needed for Nvidia
    embeddings_nvidia_model: str | None = None
    embeddings_nvidia_base_url: str | None = None
    embeddings_nvidia_api_key: SecretStr | None = None

    stt_type: Literal["azure-openai-whisper"] | None = None
    stt_azure_openai_whisper_endpoint: str | None = None
    stt_azure_openai_whisper_api_key: SecretStr | None = None
    stt_azure_openai_whisper_api_version: str | None = None
    stt_azure_openai_whisper_deployment_name: str | None = None

    store_type: Literal["azure-ai-search", "pgvector", "dev-null"]
    # needed for Azure AI Search vectorstore
    store_azure_ai_search_service_endpoint: str | None = None
    store_azure_ai_search_service_api_key: SecretStr | None = None
    store_azure_ai_search_service_index_name: str = "index"
    # needed for pgvector vectorstore
    store_pgvector_url: SecretStr | None = None
    store_pgvector_index_name: str = "index"

    file_store_type: Literal["s3", "filesystem"] | None = None
    # needed for S3 filestore
    file_store_s3_endpoint_url: str | None = None
    file_store_s3_access_key_id: str | None = None
    file_store_s3_secret_access_key: SecretStr | None = None
    file_store_s3_bucket_name: str | None = None
    file_store_s3_region_name: str | None = None
    # needed for filesystem filestore
    file_store_filesystem_basepath: str | None = None

    @model_validator(mode="after")
    def store_dependend_requirements(self) -> Self:
        if self.store_type == "pgvector":
            needed_for_pgvector = {
                "STORE_PGVECTOR_URL": self.store_pgvector_url,
            }
            check_valid_postgres_connection_string(self.store_pgvector_url)
            check_needed(needed_for_pgvector, "STORE_TYPE", "pgvector")

        if self.store_type == "azure-ai-search":
            needed_for_azure_ai_search = {
                "STORE_AZURE_AI_SEARCH_SERVICE_ENDPOINT": self.store_azure_ai_search_service_endpoint,
                "STORE_AZURE_AI_SEARCH_SERVICE_API_KEY": self.store_azure_ai_search_service_api_key,
            }
            check_needed(needed_for_azure_ai_search, "STORE_TYPE", "azure-ai-search")

        return self

    @model_validator(mode="after")
    def file_store_dependend_requirements(self) -> Self:
        if self.file_store_type == "s3":
            needed_for_s3 = {
                "FILE_STORE_S3_ENDPOINT_URL": self.file_store_s3_endpoint_url,
                "FILE_STORE_S3_ACCESS_KEY_ID": self.file_store_s3_access_key_id,
                "FILE_STORE_S3_SECRET_ACCESS_KEY": self.file_store_s3_secret_access_key,
                "FILE_STORE_S3_BUCKET_NAME": self.file_store_s3_bucket_name,
            }
            check_needed(needed_for_s3, "FILE_STORE_TYPE", "s3")
            check_valid_s3_bucket_name(self.file_store_s3_bucket_name)

        if self.file_store_type == "filesystem":
            needed_for_filesystem = {
                "FILE_STORE_FILESYSTEM_BASEPATH": self.file_store_filesystem_basepath,
            }
            check_needed(needed_for_filesystem, "FILE_STORE_TYPE", "filesystemsearch")

        return self

    @model_validator(mode="after")
    def embeddings_dependend_requirements(self) -> Self:
        if self.embeddings_type == "openai":
            needed_for_openai = {
                "EMBEDDINGS_OPENAI_API_KEY": self.embeddings_openai_api_key,
                "EMBEDDINGS_OPENAI_MODEL_NAME": self.embeddings_openai_model_name,
            }
            check_needed(needed_for_openai, "EMBEDDINGS_TYPE", "openai")

        if self.embeddings_type == "azure-openai":
            needed_for_azure_open_ai = {
                "EMBEDDINGS_AZURE_OPENAI_ENDPOINT": self.embeddings_azure_openai_endpoint,
                "EMBEDDINGS_AZURE_OPENAI_DEPLOYMENT_NAME": self.embeddings_azure_openai_deployment_name,
                "EMBEDDINGS_AZURE_OPENAI_API_KEY": self.embeddings_azure_openai_api_key,
                "EMBEDDINGS_AZURE_OPENAI_API_VERSION": self.embeddings_azure_openai_api_version,
                "EMBEDDINGS_AZURE_OPENAI_MODEL_NAME": self.embeddings_azure_openai_model_name,
            }
            check_needed(needed_for_azure_open_ai, "EMBEDDINGS_TYPE", "azure-openai")

        if self.embeddings_type == "bedrock":
            needed_for_bedrock = {
                "EMBEDDINGS_BEDROCK_MODEL_ID": self.embeddings_bedrock_model_id,
                "EMBEDDINGS_BEDROCK_REGION_NAME": self.embeddings_bedrock_region_name,
                "EMBEDDINGS_BEDROCK_AWS_ACCESS_KEY_ID": self.embeddings_bedrock_aws_access_key_id,
                "EMBEDDINGS_BEDROCK_AWS_SECRET_ACCESS_KEY": self.embeddings_bedrock_aws_secret_access_key,
            }
            check_needed(needed_for_bedrock, "EMBEDDINGS_TYPE", "bedrock")

        if self.embeddings_type == "ollama":
            needed_for_azure_open_ai = {
                "EMBEDDINGS_OLLAMA_ENDPOINT": self.embeddings_ollama_endpoint,
                "EMBEDDINGS_OLLAMA_MODEL_NAME": self.embeddings_ollama_model_name,
            }
            check_needed(needed_for_azure_open_ai, "EMBEDDINGS_TYPE", "ollama")

        if self.embeddings_type == "nvidia":
            needed_for_azure_open_ai = {
                "EMBEDDINGS_NVIDIA_MODEL": self.embeddings_nvidia_model,
                "EMBEDDINGS_NVIDIA_BASE_URL": self.embeddings_nvidia_base_url,
                "EMBEDDINGS_NVIDIA_API_KEY": self.embeddings_nvidia_api_key,
            }
            check_needed(needed_for_azure_open_ai, "EMBEDDINGS_TYPE", "nvidia")

        return self

    @model_validator(mode="after")
    def stt_dependend_requirements(self) -> Self:
        if self.stt_type == "azure-openai-whisper":
            needed_for_azure_open_ai_whisper = {
                "STT_AZURE_OPENAI_WHISPER_ENDPOINT": self.stt_azure_openai_whisper_endpoint,
                "STT_AZURE_OPENAI_WHISPER_DEPLOYMENT_NAME": self.stt_azure_openai_whisper_deployment_name,
                "STT_AZURE_OPENAI_WHISPER_API_KEY": self.stt_azure_openai_whisper_api_key,
                "STT_AZURE_OPENAI_WHISPER_API_VERSION": self.stt_azure_openai_whisper_api_version,
            }
            check_needed(needed_for_azure_open_ai_whisper, "STT_TYPE", "azure-openai-whisper")

        return self


@lru_cache
def get_config() -> Config:
    # We need to ignore the missing argument errors, because we want Config to raise in case
    # a mandatory argument was not passed via an env variable.
    config = Config()  # type: ignore[call-arg]
    logger.info(f"starting REIS with following configuration:\n{json.dumps(config.model_dump(mode='json'), indent=2)}")
    return config
