from typing import Literal, get_args

from llm_eval.qa_catalog.generator.interface import QACatalogGenerator

RagasGeneratorType = Literal["RAGAS"]
QACatalogGeneratorType = RagasGeneratorType

active_generator_types: list[str] = [
    get_args(RagasGeneratorType)[0],
]


def get_catalog_generator_class(
    requested_generator_type: str,
) -> type[QACatalogGenerator]:
    found_generator_type = next(
        (
            generator_type
            for generator_type in active_generator_types  # type: ignore
            if generator_type == requested_generator_type
        ),
        None,
    )

    if found_generator_type == get_args(RagasGeneratorType)[0]:
        from llm_eval.qa_catalog.generator.implementation.ragas.generator import (  # noqa: E501
            RagasQACatalogGenerator,
        )

        return RagasQACatalogGenerator

    raise ValueError(f"No qa catalog generator found for {found_generator_type}")
