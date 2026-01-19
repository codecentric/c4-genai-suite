import abc

from deepeval.metrics import BaseMetric
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.schemas import ApiModel
from llm_eval.utils.json_types import JSONObject


class BaseConfiguration[MetricType: str](BaseModel):
    type: MetricType
    name: str

    def to_db_json(self) -> JSONObject:
        return self.model_dump()


class BaseConfigurationRead[MetricType: str](ApiModel):
    type: MetricType
    name: str


class BaseConfigurationCreate[MetricType: str](ApiModel):
    type: MetricType
    name: str


class BaseConfigurationUpdate[MetricType: str](ApiModel):
    type: MetricType
    name: str | None = None


class MetricPlugin[
    MetricType: str,
    Configuration: BaseConfiguration,
    ConfigurationRead: BaseConfigurationRead,
    ConfigurationCreate: BaseConfigurationCreate,
    ConfigurationUpdate: BaseConfigurationUpdate,
](abc.ABC):
    metric_type: MetricType

    def __init__(self, metric_type: MetricType) -> None:
        self.metric_type = metric_type

    @abc.abstractmethod
    def configuration_from_db_json(self, json: JSONObject) -> Configuration: ...

    @abc.abstractmethod
    def configuration_from_create_data(
        self, create_configuration: ConfigurationCreate
    ) -> Configuration: ...

    @abc.abstractmethod
    def update_configuration(
        self, configuration: Configuration, update_configuration: ConfigurationUpdate
    ) -> Configuration:
        return configuration.model_copy(
            update={
                "name": update_configuration.name
                if update_configuration.name is not None
                else configuration.name,
            }
        )

    @abc.abstractmethod
    def create_read_model_from_configuration(
        self, configuration: Configuration
    ) -> ConfigurationRead: ...

    @abc.abstractmethod
    async def create_deepeval_metric(
        self, session: AsyncSession, configuration: Configuration
    ) -> BaseMetric: ...
