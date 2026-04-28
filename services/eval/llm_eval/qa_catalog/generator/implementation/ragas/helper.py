from uuid import uuid4

from ragas import SingleTurnSample
from ragas.testset import TestsetSample

from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


def ragas_sample_to_synthetic_qa_pair(sample: TestsetSample) -> SyntheticQAPair:
    qa_data = sample.eval_sample
    if not isinstance(qa_data, SingleTurnSample):
        raise NotImplementedError("MultiTurnSample is not supported yet.")

    _contexts = qa_data.reference_contexts if qa_data.reference_contexts else []
    return SyntheticQAPair(
        id=str(uuid4()),
        question=qa_data.user_input if qa_data.user_input else "",
        contexts=_contexts,
        expected_output=qa_data.reference if qa_data.reference else "",
        meta_data={
            "synthesizer": sample.synthesizer_name,
        },
    )
