from pydantic import BaseModel, ConfigDict
from pydantic.alias_generators import to_camel
from pydantic.dataclasses import dataclass

from llm_eval.utils.json_types import JSONVal

config = ConfigDict(
    alias_generator=to_camel,
    populate_by_name=True,
    from_attributes=True,
)


class ApiModel(BaseModel):
    model_config = config


@dataclass(config=config)
class GenericError:
    details: JSONVal
