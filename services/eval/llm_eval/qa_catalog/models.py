from datetime import datetime
from typing import Literal

from llm_eval.database.model import QACatalog as QACatalogModel
from llm_eval.database.model import QACatalogStatus
from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    QACatalogGeneratorType,
)
from llm_eval.qa_catalog.generator.implementation.ragas.config import (
    RagasQACatalogGeneratorConfig,
    RagasQACatalogGeneratorModelConfigSchema,
)
from llm_eval.schemas import ApiModel


class QACatalogPreview(ApiModel):
    id: str
    name: str
    length: int
    revision: int
    created_at: datetime
    updated_at: datetime
    status: QACatalogStatus


class QAPair(ApiModel):
    id: str
    question: str
    expected_output: str
    contexts: list[str]
    meta_data: dict


class QACatalog(ApiModel):
    id: str
    name: str
    created_at: datetime
    updated_at: datetime
    revision: int
    status: QACatalogStatus
    error: str | None = None

    @staticmethod
    def from_db_model(qa_catalog_db_model: QACatalogModel) -> "QACatalog":
        return QACatalog(
            id=qa_catalog_db_model.id,
            name=qa_catalog_db_model.qa_catalog_group.name,
            created_at=qa_catalog_db_model.created_at,
            updated_at=qa_catalog_db_model.updated_at,
            revision=qa_catalog_db_model.revision,
            status=qa_catalog_db_model.status,
            error=qa_catalog_db_model.error,
        )


class DeleteCatalogResult(ApiModel):
    previous_revision_id: str | None


class NewQAPair(ApiModel):
    question: str
    expected_output: str
    contexts: list[str]


class QACatalogUpdateRequest(ApiModel):
    updates: list[QAPair]
    additions: list[NewQAPair]
    deletions: list[str]


type QACatalogGenerationConfig = RagasQACatalogGeneratorConfig
type QACatalogGenerationModelConfigurationSchema = (
    RagasQACatalogGeneratorModelConfigSchema
)


class QACatalogGenerationData(ApiModel):
    type: QACatalogGeneratorType
    name: str
    config: QACatalogGenerationConfig
    data_source_config_id: str
    model_config_schema: QACatalogGenerationModelConfigurationSchema


class QACatalogGenerationResult(ApiModel):
    catalog_id: str


class QACatalogGenerationFromC4BucketRequest(ApiModel):
    """Request to generate a QA catalog from files in a C4 bucket."""

    bucket_id: int
    file_ids: list[int]
    name: str
    type: QACatalogGeneratorType
    config: QACatalogGenerationConfig
    model_config_schema: QACatalogGenerationModelConfigurationSchema


class ActiveQACatalogGeneratorType(ApiModel):
    type: QACatalogGeneratorType


type Base64DownloadURL = str


class DownloadQACatalogResponse(ApiModel):
    download_url: Base64DownloadURL
    filename: str


class QACatalogVersionHistoryItem(ApiModel):
    version_id: str
    created_at: datetime
    revision: int


class QACatalogVersionHistory(ApiModel):
    versions: list[QACatalogVersionHistoryItem]


type SupportedQACatalogDownloadFormat = Literal["csv", "json", "yaml", "xlsx"]


class DownloadQACatalogOptions(ApiModel):
    format: SupportedQACatalogDownloadFormat
    parent_catalog_id: str

    version_ids: list[str] | None = None
    include_all: bool = False
