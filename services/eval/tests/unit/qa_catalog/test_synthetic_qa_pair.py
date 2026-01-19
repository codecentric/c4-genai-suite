import pytest
from ragas import MultiTurnSample, SingleTurnSample
from ragas.messages import AIMessage, HumanMessage, ToolCall
from ragas.testset import TestsetSample as RagasTestsetSample

from llm_eval.qa_catalog.generator.implementation.ragas.helper import (
    ragas_sample_to_synthetic_qa_pair,
)


def test_from_ragas_for_single_turn_sample() -> None:
    eval_sample = SingleTurnSample(
        user_input="Define AI.",
        reference_contexts=["AI definition", "Artificial Intelligence"],
        reference="An area of computer science",
    )

    sample = RagasTestsetSample(eval_sample=eval_sample, synthesizer_name="test_synth")
    qa_pair = ragas_sample_to_synthetic_qa_pair(sample)

    assert qa_pair.id, "The generated id should not be empty"
    assert qa_pair.question == "Define AI."
    assert qa_pair.contexts == ["AI definition", "Artificial Intelligence"]
    assert qa_pair.expected_output == "An area of computer science"
    assert qa_pair.meta_data == {"synthesizer": "test_synth"}


def test_from_ragas_for_multi_turn_sample() -> None:
    multi_turn_sample = MultiTurnSample(
        user_input=[
            HumanMessage(content="Define AI."),
            AIMessage(content="AI stands for Artificial Intelligence."),
        ],
        reference="Artificial Intelligence definition",
        reference_tool_calls=[ToolCall(name="example_tool", args={"param1": "value1"})],
        rubrics={"clarity": "clear", "accuracy": "high"},
        reference_topics=["AI", "Machine Learning"],
    )
    sample = RagasTestsetSample(
        eval_sample=multi_turn_sample,
        synthesizer_name="test_synth",
    )

    with pytest.raises(
        NotImplementedError,
    ):
        ragas_sample_to_synthetic_qa_pair(sample)
