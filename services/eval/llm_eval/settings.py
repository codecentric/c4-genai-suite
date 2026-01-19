from pathlib import Path
from typing import Any
from urllib.parse import quote_plus

from pydantic import Field, PostgresDsn, SecretBytes
from pydantic_settings import BaseSettings as PydanticBaseSettings
from pydantic_settings import SettingsConfigDict

from llm_eval.config.paths import DATA_DIR, PROJECT_ROOT_DIR


class BaseSettings(PydanticBaseSettings):
    def __init_subclass__(cls, prefix: str | None = None, **kwargs: Any) -> None:
        super().__init_subclass__(**kwargs)

        config = SettingsConfigDict(
            env_file=(
                PROJECT_ROOT_DIR / ".env",
                PROJECT_ROOT_DIR / ".env.services",
            ),
            env_file_encoding="utf-8",
            extra="allow",
            case_sensitive=False,
        )
        if prefix:
            config["env_prefix"] = prefix
        cls.model_config = config


class CelerySettings(BaseSettings, prefix="CELERY_"):
    broker_user: str = Field(default="rabbit")
    broker_password: str = Field(default="rabbit")
    broker_host: str = Field(default="localhost")
    broker_port: int = Field(default=5672)

    @property
    def broker(self) -> str:
        user = quote_plus(self.broker_user)
        password = quote_plus(self.broker_password)
        return f"pyamqp://{user}:{password}@{self.broker_host}:{self.broker_port}"  # gitleaks:allow

    @property
    def heartbeat_file(self) -> str:
        return str(DATA_DIR / "celery_worker_heartbeat")

    @property
    def readiness_file(self) -> str:
        return str(DATA_DIR / "celery_worker_ready")


class EvaluationSettings(BaseSettings, prefix="EVALUATION_"):
    max_retries: int = Field(default=10)
    run_async: bool = Field(default=True)
    show_indicator: bool = Field(default=True)
    parallel_test_cases: int = Field(default=1)
    parallel_generation_limit: int = Field(default=5)


class DeepEvalSettings(BaseSettings, prefix="DEEPEVAL_"):
    max_retries: int = Field(default=10)


class RagasSettings(BaseSettings, prefix="RAGAS_"):
    parallel_generation_limit: int = Field(default=5)
    embeddings: dict[str, Any] = Field(default_factory=dict)


class FileStoreSettings(BaseSettings, prefix="FILE_STORE_"):
    type: str | None = Field(default=None)
    s3_endpoint_url: str | None = Field(default=None)
    s3_access_key_id: str | None = Field(default=None)
    s3_secret_access_key: str = Field(default="")
    s3_bucket_name: str | None = Field(default=None)
    s3_region_name: str | None = Field(default=None)


class Settings(BaseSettings):
    encryption_key: SecretBytes = Field(
        alias="LLM_EVAL_ENCRYPTION_KEY",
    )

    celery: CelerySettings = CelerySettings()
    evaluation: EvaluationSettings = EvaluationSettings()

    deepeval: DeepEvalSettings = DeepEvalSettings()
    ragas: RagasSettings = RagasSettings()
    file_store: FileStoreSettings = FileStoreSettings()

    file_upload_temp_location: Path = Field(default=DATA_DIR / "uploaded_files")

    pg_user: str = Field(default="postgres")
    pg_password: str = Field(default="postgres")
    pg_host: str = Field(default="localhost")
    pg_db: str = Field(default="postgres")
    pg_port: int = Field(default=5432)
    pg_schema: str = Field(default="llm_eval")

    def __postgres_string(self, sync: bool = False) -> PostgresDsn:
        return PostgresDsn.build(
            scheme="postgresql+asyncpg" if not sync else "postgresql",
            username=self.pg_user,
            password=self.pg_password,
            port=self.pg_port,
            host=self.pg_host,
            path=self.pg_db,
        )

    @property
    def connection_string(self) -> str:
        return self.__postgres_string().encoded_string()

    @property
    def connection_string_sync(self) -> str:
        return self.__postgres_string(sync=True).encoded_string()


SETTINGS = Settings()  # type: ignore
