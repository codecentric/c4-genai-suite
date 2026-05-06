from typing import Literal, get_args

from deepeval.metrics import BaseMetric, GEval
from deepeval.test_case import LLMTestCaseParams
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.metrics.plugins.interface import (
    BaseConfiguration,
    BaseConfigurationCreate,
    BaseConfigurationRead,
    BaseConfigurationUpdate,
    MetricPlugin,
)
from llm_eval.metrics.plugins.utils import get_chat_model
from llm_eval.utils.deepeval_llm import DeepEvalChatModel
from llm_eval.utils.json_types import JSONObject

MetricType = Literal["G_EVAL"]

METRIC_TYPE: MetricType = get_args(MetricType)[0]


class GEvalMetricConfiguration(BaseConfiguration[MetricType]):
    evaluation_steps: list[str]
    evaluation_params: list[LLMTestCaseParams]
    chat_model_id: str
    strict_mode: bool = False
    threshold: float = 0.5

    def to_db_json(self) -> JSONObject:
        raw_data = self.model_dump()
        raw_data["evaluation_params"] = [
            param.value for param in self.evaluation_params
        ]

        return raw_data


class GEvalMetricConfigurationRead(BaseConfigurationRead[MetricType]):
    evaluation_steps: list[str]
    evaluation_params: list[LLMTestCaseParams]
    chat_model_id: str
    strict_mode: bool
    threshold: float


class GEvalMetricConfigurationCreate(BaseConfigurationCreate[MetricType]):
    evaluation_steps: list[str]
    evaluation_params: list[LLMTestCaseParams]
    chat_model_id: str
    strict_mode: bool
    threshold: float


class GEvalMetricConfigurationUpdate(BaseConfigurationUpdate[MetricType]):
    evaluation_steps: list[str] | None = None
    evaluation_params: list[LLMTestCaseParams] | None = None
    chat_model_id: str | None = None
    strict_mode: bool | None = None
    threshold: float | None = None


class GEvalMetricPlugin(
    MetricPlugin[
        MetricType,
        GEvalMetricConfiguration,
        GEvalMetricConfigurationRead,
        GEvalMetricConfigurationCreate,
        GEvalMetricConfigurationUpdate,
    ]
):
    def __init__(self) -> None:
        super().__init__(METRIC_TYPE)

    def configuration_from_db_json(self, json: JSONObject) -> GEvalMetricConfiguration:
        return GEvalMetricConfiguration.model_validate(json)

    def configuration_from_create_data(
        self, create_configuration: GEvalMetricConfigurationCreate
    ) -> GEvalMetricConfiguration:
        return GEvalMetricConfiguration.model_validate(
            create_configuration.model_dump()
        )

    def update_configuration(
        self,
        configuration: GEvalMetricConfiguration,
        update_configuration: GEvalMetricConfigurationUpdate,
    ) -> GEvalMetricConfiguration:
        return (
            super()
            .update_configuration(configuration, update_configuration)
            .model_copy(
                update={
                    "evaluation_steps": update_configuration.evaluation_steps
                    if update_configuration.evaluation_steps is not None
                    else configuration.evaluation_steps,
                    "evaluation_params": update_configuration.evaluation_params
                    if update_configuration.evaluation_params is not None
                    else configuration.evaluation_params,
                    "chat_model_id": update_configuration.chat_model_id
                    if update_configuration.chat_model_id is not None
                    else configuration.chat_model_id,
                    "strict_mode": update_configuration.strict_mode
                    if update_configuration.strict_mode is not None
                    else configuration.strict_mode,
                    "threshold": update_configuration.threshold
                    if update_configuration.threshold is not None
                    else configuration.threshold,
                }
            )
        )

    def create_read_model_from_configuration(
        self, configuration: GEvalMetricConfiguration
    ) -> GEvalMetricConfigurationRead:
        return GEvalMetricConfigurationRead.model_validate(configuration)

    async def create_deepeval_metric(
        self, session: AsyncSession, configuration: GEvalMetricConfiguration
    ) -> BaseMetric:
        return GEval(
            name=configuration.name,
            evaluation_steps=configuration.evaluation_steps,
            evaluation_params=configuration.evaluation_params,
            strict_mode=configuration.strict_mode,
            threshold=configuration.threshold,
            model=DeepEvalChatModel(
                await get_chat_model(session, configuration.chat_model_id),
            ),
        )
