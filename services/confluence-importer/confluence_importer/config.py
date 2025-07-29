from typing import Annotated

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Config(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore", env_ignore_empty=True)

    confluence_space_keys_to_import: list[str]
    confluence_page_ids_to_import: list[int]
    confluence_token: str
    confluence_url: str
    c4_base_url: str
    c4_bucket_id: Annotated[int, Field(gt=0)]
    c4_token: str


config = Config()
