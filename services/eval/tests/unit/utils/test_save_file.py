import json
import os

import pytest
from pydantic import BaseModel

from llm_eval.utils.save_file import save_output_as_json


def test_output_as_json_no_file_raise_exception() -> None:
    with pytest.raises(Exception) as e:
        save_output_as_json([], "")
    assert str(e.value) == "[Errno 2] No such file or directory: ''"


def test_save_output_as_json_success() -> None:
    # Define test data
    results = [{"name": "John", "age": 30}, {"name": "Jane", "age": 25}]
    file_path = "test_output.json"

    # Call the function
    save_output_as_json(results, file_path)

    # Verify the file is created and contains the expected data
    with open(file_path, "r") as json_file:
        saved_results = json.load(json_file)
        assert saved_results == results

    # Clean up the test file
    os.remove(file_path)


def test_save_output_as_json_success_with_nonserializable_object() -> None:
    class Person(BaseModel):
        name: str
        age: int

    # Define test data
    results = [Person(name="John", age=30), Person(name="Jane", age=25)]
    file_path = "test_output.json"

    # Call the function
    save_output_as_json(results, file_path)

    # Verify the file is created and contains the expected data
    with open(file_path, "r") as json_file:
        saved_results = json.load(json_file)
        assert saved_results == [
            {"name": "John", "age": 30},
            {"name": "Jane", "age": 25},
        ]

    # Clean up the test file
    os.remove(file_path)
