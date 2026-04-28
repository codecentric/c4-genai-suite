from llm_eval.database.model import QAPair
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


def synthethic_qa_pairs_to_db_models(
    qa_pairs: list[SyntheticQAPair], qa_catalog_id: str
) -> list[QAPair]:
    return [
        QAPair(
            id=pair.id,
            question=pair.question,
            expected_output=pair.expected_output,
            contexts=pair.contexts,
            meta_data=pair.meta_data,
            qa_catalog_id=qa_catalog_id,
        )
        for pair in qa_pairs
    ]
