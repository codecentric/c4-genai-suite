from enum import StrEnum
from pathlib import Path

from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    RagasGeneratorType,
)
from llm_eval.qa_catalog.generator.interface import (
    QACatalogGeneratorConfig,
    QACatalogGeneratorModelConfig,
    QACatalogGeneratorModelConfigSchema,
)
from llm_eval.schemas import ApiModel


class RagasQACatalogQuerySynthesizer(StrEnum):
    SINGLE_HOP_SPECIFIC = "SINGLE_HOP_SPECIFIC"
    MULTI_HOP_SPECIFIC = "MULTI_HOP_SPECIFIC"
    MULTI_HOP_ABSTRACT = "MULTI_HOP_ABSTRACT"


class RagasQACatalogGeneratorPersona(ApiModel):
    name: str
    description: str


class RagasQACatalogGeneratorConfig(QACatalogGeneratorConfig[RagasGeneratorType]):
    knowledge_graph_location: Path | None
    sample_count: int
    query_distribution: list[RagasQACatalogQuerySynthesizer]
    personas: list[RagasQACatalogGeneratorPersona] | None

    use_existing_knowledge_graph: bool = True


class RagasQACatalogGeneratorModelConfigSchema(
    QACatalogGeneratorModelConfigSchema[RagasGeneratorType]
): ...


class RagasQACatalogGeneratorModelConfig(
    QACatalogGeneratorModelConfig[RagasGeneratorType]
): ...
