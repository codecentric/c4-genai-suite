from pydantic import BaseModel

from llm_eval.utils.json_types import JSONObject


class SyntheticQAPair(BaseModel):
    """
    The generated qa pair by the synthetic qa generator.
    """

    id: str
    question: str
    contexts: list[str]
    expected_output: str
    meta_data: JSONObject
