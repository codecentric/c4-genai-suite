from uuid import uuid4

from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import QACatalog, QACatalogGroup, QAPair
from llm_eval.qa_catalog.db.insert_qa_catalog import insert_qa_catalog
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


def _create_qa_catalog_entity(
    qa_catalog_group: QACatalogGroup, pairs: list[SyntheticQAPair]
) -> QACatalog:
    return QACatalog(
        id=str(uuid4()),
        qa_catalog_group_id=qa_catalog_group.id,
        qa_catalog_group=qa_catalog_group,
        revision=1,
        qa_pairs=[
            QAPair(
                id=pair.id,
                question=pair.question,
                expected_output=pair.expected_output,
                contexts=pair.contexts,
                meta_data=pair.meta_data,
            )
            for pair in pairs
        ],
    )


def _create_qa_catalog_group_entity(name: str) -> QACatalogGroup:
    return QACatalogGroup(id=str(uuid4()), name=name)


def store_qa_pairs(session: AsyncSession, qa_pairs: list[QAPair]) -> None:
    session.add_all(qa_pairs)


async def create_qa_catalog(
    db: AsyncSession, pairs: list[SyntheticQAPair], name: str
) -> QACatalog:
    qa_catalog_group = _create_qa_catalog_group_entity(name=name)
    qa_catalog = _create_qa_catalog_entity(qa_catalog_group, pairs)

    await insert_qa_catalog(db, qa_catalog)

    return qa_catalog
