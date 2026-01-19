import json
from typing import Any, List
from loguru import logger


def save_output_as_json(results: List[Any], file_path: str) -> None:
    """
    Saves the evaluation results as a JSON file.

    :param results: List of evaluation results (could be dictionaries or objects).
    :param file_path: Path where the JSON file will be saved.
    """
    # Convert any non-serializable objects (like pydantic models) to dicts
    results_to_save = [
        result.model_dump() if hasattr(result, "dict") else result for result in results
    ]

    # Write results to JSON file
    with open(file_path, "w") as json_file:
        json.dump(results_to_save, json_file, indent=4, ensure_ascii=False)

    logger.info(f"Results successfully saved to {file_path}")
