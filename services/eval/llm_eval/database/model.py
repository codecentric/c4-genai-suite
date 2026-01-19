import datetime
from enum import StrEnum
from typing import List

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
    UniqueConstraint,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.ext.asyncio import AsyncAttrs
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

from llm_eval.utils.json_types import JSONObject

# Use llm_eval schema for all tables
SCHEMA_NAME = "llm_eval"


class Base(AsyncAttrs, DeclarativeBase):
    metadata = MetaData(schema=SCHEMA_NAME)


class CreatedTrait:
    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    created_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class UpdatedTrait:
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class DeletedTrait:
    deleted_at: Mapped[datetime.datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    deleted_by: Mapped[str | None] = mapped_column(String(36), nullable=True)


class QACatalogGeneratorTempDataSourceConfig(Base):
    __tablename__ = "qa_catalog_generator_temp_data_source_config"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    config: Mapped[JSONObject] = mapped_column(JSONB, nullable=True)


class QACatalogStatus(StrEnum):
    GENERATING = "GENERATING"
    READY = "READY"
    FAILURE = "FAILURE"


class QACatalog(Base):
    __tablename__ = "qa_catalog"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)

    revision: Mapped[int] = mapped_column(Integer, server_default=text("0"))

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    qa_pairs: Mapped[List["QAPair"]] = relationship(
        back_populates="qa_catalog", cascade="all, delete-orphan"
    )

    qa_catalog_group_id: Mapped[str] = mapped_column(ForeignKey("qa_catalog_group.id"))
    qa_catalog_group: Mapped["QACatalogGroup"] = relationship(
        back_populates="qa_catalogs", lazy="selectin"
    )

    status: Mapped[QACatalogStatus] = mapped_column(
        Enum(QACatalogStatus, native_enum=False),
        default=QACatalogStatus.GENERATING,
        server_default=QACatalogStatus.READY,
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)


class QACatalogGroup(Base):
    __tablename__ = "qa_catalog_group"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    name: Mapped[str] = mapped_column(String(255))

    created_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime.datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    qa_catalogs: Mapped[List["QACatalog"]] = relationship(
        back_populates="qa_catalog_group", lazy="selectin"
    )


class QAPair(Base):
    __tablename__ = "qa_pair"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    expected_output: Mapped[str] = mapped_column(Text)
    contexts: Mapped[list[str]] = mapped_column(JSONB)
    question: Mapped[str] = mapped_column(Text)

    meta_data: Mapped[JSONObject | None] = mapped_column(JSONB, nullable=True)

    qa_catalog_id: Mapped[str] = mapped_column(ForeignKey("qa_catalog.id"))
    qa_catalog: Mapped["QACatalog"] = relationship(back_populates="qa_pairs")


evaluation_evaluation_metric_association_table = Table(
    "evaluation_evaluation_metric",
    Base.metadata,
    Column("evaluation_id", ForeignKey("evaluation.id"), primary_key=True),
    Column("metric_id", ForeignKey("evaluation_metric.id"), primary_key=True),
)


class EvaluationStatus(StrEnum):
    PENDING = "PENDING"
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


class Evaluation(Base, CreatedTrait, UpdatedTrait, DeletedTrait):
    __tablename__ = "evaluation"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    name: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(String(255), nullable=True)
    status: Mapped[EvaluationStatus] = mapped_column(
        Enum(EvaluationStatus, native_enum=False),
        default=EvaluationStatus.PENDING,
        server_default=EvaluationStatus.SUCCESS,
    )

    catalog_id: Mapped[str | None] = mapped_column(
        ForeignKey("qa_catalog.id"), nullable=True
    )
    catalog: Mapped["QACatalog"] = relationship()
    test_cases: Mapped[List["TestCase"]] = relationship(
        back_populates="evaluation", cascade="all, delete-orphan"
    )
    llm_endpoint_id: Mapped[str | None] = mapped_column(
        ForeignKey("llm_endpoint.id"), nullable=True
    )
    llm_endpoint: Mapped["LLMEndpoint"] = relationship()

    metrics: Mapped[List["EvaluationMetric"]] = relationship(
        secondary=evaluation_evaluation_metric_association_table,
        back_populates="evaluations",
    )

    __mapper_args__ = {"version_id_col": version}


class TestCaseStatus(StrEnum):
    PENDING = "PENDING"
    RETRIEVING_ANSWER = "RETRIEVING_ANSWER"
    EVALUATING = "EVALUATING"
    SUCCESS = "SUCCESS"
    FAILURE = "FAILURE"


TEST_CASE_FINISHED_STATES = [TestCaseStatus.SUCCESS, TestCaseStatus.FAILURE]


class TestCase(Base):
    __tablename__ = "test_case"
    __table_args__ = (
        UniqueConstraint(
            "grouping_key", "index", "evaluation_id", name="ui_evaluation_test_case"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[TestCaseStatus] = mapped_column(
        Enum(TestCaseStatus, native_enum=False),
        default=TestCaseStatus.PENDING,
        server_default=TestCaseStatus.SUCCESS,
    )
    grouping_key: Mapped[str | None] = mapped_column(String(36), nullable=False)
    index: Mapped[int] = mapped_column(Integer, server_default="0")

    input: Mapped[str] = mapped_column(Text)
    actual_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    expected_output: Mapped[str | None] = mapped_column(Text, nullable=True)
    context: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)
    retrieval_context: Mapped[list[str] | None] = mapped_column(JSONB, nullable=True)

    meta_data: Mapped[JSONObject | None] = mapped_column(JSONB, nullable=True)
    llm_configuration_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    llm_configuration_name: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )
    llm_configuration_version: Mapped[str | None] = mapped_column(
        String(255), nullable=True
    )

    evaluation_id: Mapped[str] = mapped_column(ForeignKey("evaluation.id"))
    evaluation: Mapped["Evaluation"] = relationship(back_populates="test_cases")

    evaluation_results: Mapped[List["TestCaseEvaluationResult"]] = relationship(
        back_populates="test_case", cascade="all, delete-orphan"
    )

    __mapper_args__ = {"version_id_col": version}

    def is_finished(self) -> bool:
        return self.status in TEST_CASE_FINISHED_STATES


class TestCaseEvaluationResult(Base):
    __tablename__ = "test_case_evaluation_result"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    created_at: Mapped[datetime.datetime] = mapped_column(DateTime(timezone=True))

    # MetricData from DeepEval
    name: Mapped[str] = mapped_column(String(255))
    threshold: Mapped[float | None] = mapped_column(Float, nullable=True)
    success: Mapped[bool] = mapped_column(Boolean)
    score: Mapped[float | None] = mapped_column(Float, nullable=True)
    reason: Mapped[str | None] = mapped_column(Text, nullable=True)
    strict_mode: Mapped[bool | None] = mapped_column(
        Boolean, default=False, nullable=True
    )
    evaluation_model: Mapped[str | None] = mapped_column(String(255), nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    evaluation_cost: Mapped[float | None] = mapped_column(Float, nullable=True)
    verbose_logs: Mapped[str | None] = mapped_column(Text, nullable=True)

    test_case_id: Mapped[str] = mapped_column(ForeignKey("test_case.id"))
    test_case: Mapped["TestCase"] = relationship(back_populates="evaluation_results")
    evaluation_metric_id: Mapped[str] = mapped_column(
        ForeignKey("evaluation_metric.id")
    )
    evaluation_metric: Mapped["EvaluationMetric"] = relationship()


class LLMEndpoint(Base, CreatedTrait, UpdatedTrait, DeletedTrait):
    __tablename__ = "llm_endpoint"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    type: Mapped[str] = mapped_column(String(255))
    name: Mapped[str] = mapped_column(String(255))
    endpoint_config: Mapped[JSONObject] = mapped_column(JSONB)

    __mapper_args__ = {"version_id_col": version}


class EvaluationMetric(Base, CreatedTrait, UpdatedTrait, DeletedTrait):
    __tablename__ = "evaluation_metric"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    version: Mapped[int] = mapped_column(
        Integer, nullable=False, server_default=text("0")
    )
    metric_config: Mapped[JSONObject] = mapped_column(JSONB)

    evaluations: Mapped[List["Evaluation"]] = relationship(
        secondary=evaluation_evaluation_metric_association_table,
        back_populates="metrics",
    )

    __mapper_args__ = {"version_id_col": version}
