from abc import ABC, abstractmethod
from copy import copy
from dataclasses import dataclass
from pathlib import Path
from typing import Callable, Coroutine, cast

from langchain_core.language_models import BaseChatModel

from llm_eval.database.model import LLMEndpoint
from llm_eval.llm_endpoints.plugins.factory import get_endpoint_plugin
from llm_eval.llm_endpoints.plugins.interface import ChatModelSupport
from llm_eval.schemas import ApiModel
from llm_eval.utils.encrypter import decrypt, encrypt
from llm_eval.utils.json_types import JSONObject


@dataclass
class QACatalogGeneratorModelConfig[QACatalogGeneratorType: str]:
    """
    For use with backend
    """

    type: QACatalogGeneratorType
    llm_endpoint: LLMEndpoint


class QACatalogGeneratorModelConfigSchema[QACatalogGeneratorType: str](ApiModel):
    type: QACatalogGeneratorType
    llm_endpoint: str

    class Config:
        populate_by_name = True


@dataclass
class QACatalogGeneratorLocalModelConfig[QACatalogGeneratorType: str]:
    """
    For use with cli
    """

    type: QACatalogGeneratorType
    llm: BaseChatModel


class QACatalogGeneratorConfig[QACatalogGeneratorType: str](ApiModel):
    type: QACatalogGeneratorType


class QACatalogGeneratorDataSourceConfig[QACatalogGeneratorType: str](ApiModel):
    type: QACatalogGeneratorType
    data_source_location: Path
    data_source_glob: list[str]

    def to_db_json(self) -> JSONObject:
        return self.model_copy(
            update={"data_source_location": encrypt(str(self.data_source_location))}
        ).model_dump()

    @classmethod
    def from_db_json(cls, obj: JSONObject) -> "QACatalogGeneratorDataSourceConfig":
        _obj = cast(dict, copy(obj))
        _obj["data_source_location"] = Path(decrypt(_obj["data_source_location"]))
        return cls.model_validate(_obj)


class QACatalogGenerator[
    QACatalogGeneratorType: str,
    Configuration: QACatalogGeneratorConfig,
    DataSourceConfiguration: QACatalogGeneratorDataSourceConfig,
    ModelConfiguration: QACatalogGeneratorModelConfig
    | QACatalogGeneratorLocalModelConfig,
](ABC):
    generator_type: QACatalogGeneratorType

    def __init__(
        self,
        config: Configuration,
        data_source_config: DataSourceConfiguration,
        model_config: ModelConfiguration,
    ) -> None:
        if (
            model_config
        ):  # trying to prevent unused, this parameter helps subclasses to instantiate
            ...

        self.config = config
        self.data_source_config = data_source_config

    @staticmethod
    def load_chat_model(llm_endpoint: LLMEndpoint) -> BaseChatModel:
        endpoint_plugin = get_endpoint_plugin(llm_endpoint)
        endpoint_configuration = endpoint_plugin.configuration_from_db_json(
            llm_endpoint.endpoint_config
        )

        if not isinstance(endpoint_plugin, ChatModelSupport):
            raise Exception("Used endpoint does not support chat models")

        return endpoint_plugin.create_chat_model(endpoint_configuration)

    @staticmethod
    @abstractmethod
    def create_configuration_from_dict(_dict: dict) -> Configuration: ...

    @staticmethod
    @abstractmethod
    def create_model_configuration_from_kwargs(
        kwargs: dict,
    ) -> ModelConfiguration: ...


class SyncQACatalogGeneratorSupport(ABC):
    from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair

    @abstractmethod
    def create_synthetic_qa(self) -> list[SyntheticQAPair]: ...


class AsyncQACatalogGeneratorSupport(ABC):
    from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair

    @abstractmethod
    async def a_create_synthetic_qa(
        self,
        collect_samples: Callable[[list[SyntheticQAPair]], Coroutine],
    ) -> None: ...
