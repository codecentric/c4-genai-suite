from contextlib import contextmanager
from pathlib import Path
from random import shuffle
from typing import Callable, ContextManager, Generator
from unittest.mock import MagicMock, patch

import pytest
from langchain_core.documents import Document
from ragas.testset.graph import Node, NodeType

from llm_eval.qa_catalog.generator.implementation.ragas.config import (
    RagasQACatalogGeneratorConfig,
    RagasQACatalogGeneratorModelConfig,
    RagasQACatalogQuerySynthesizer,
)
from llm_eval.qa_catalog.generator.implementation.ragas.generator import (
    RagasQACatalogGenerator,
)
from llm_eval.qa_catalog.generator.interface import (
    QACatalogGeneratorDataSourceConfig,
    QACatalogGeneratorLocalModelConfig,
)
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair
from llm_eval.settings import SETTINGS


@pytest.fixture
def config() -> RagasQACatalogGeneratorConfig:
    return RagasQACatalogGeneratorConfig(
        type="RAGAS",
        knowledge_graph_location=None,
        sample_count=10,
        query_distribution=[
            RagasQACatalogQuerySynthesizer.SINGLE_HOP_SPECIFIC,
            RagasQACatalogQuerySynthesizer.MULTI_HOP_SPECIFIC,
            RagasQACatalogQuerySynthesizer.MULTI_HOP_ABSTRACT,
        ],
        personas=None,
    )


@pytest.fixture
def data_source_config() -> QACatalogGeneratorDataSourceConfig:
    return QACatalogGeneratorDataSourceConfig(
        type="RAGAS",
        data_source_location=Path("mock path"),
        data_source_glob=["**/*.txt"],
    )


@pytest.fixture
def ragas_model_config() -> RagasQACatalogGeneratorModelConfig:
    return RagasQACatalogGeneratorModelConfig(type="RAGAS", llm_endpoint=MagicMock())


@pytest.fixture
def normal_model_config() -> QACatalogGeneratorLocalModelConfig:
    return QACatalogGeneratorLocalModelConfig(type="RAGAS", llm=MagicMock())


@pytest.fixture
def filenames() -> list[str]:
    return [f"data-{i}.txt" for i in range(5)]


@pytest.fixture
def documents(filenames: list[str]) -> list[Document]:
    return [
        Document(
            page_content=f"document content {i}",
            metadata={"source": filename},
        )
        for i, filename in enumerate(filenames)
    ]


@pytest.fixture
def nodes(documents: list[Document]) -> list[Node]:
    return [
        Node(
            type=NodeType.DOCUMENT,
            properties={
                "document_metadata": {
                    "source": document.metadata["source"],
                    "page-content": document.page_content,
                }
            },
        )
        for document in documents
    ]


RagasGeneratorCMType = Generator[RagasQACatalogGenerator, None, None]
RagasGeneratorFactory = Callable[[], ContextManager[RagasQACatalogGenerator]]


@pytest.fixture
def ragas_generator_factory(
    config: RagasQACatalogGeneratorConfig,
    ragas_model_config: RagasQACatalogGeneratorModelConfig,
) -> RagasGeneratorFactory:
    @contextmanager
    def _func() -> RagasGeneratorCMType:
        with patch(
            "llm_eval.qa_catalog.generator.implementation.ragas.generator.RagasQACatalogGenerator.load_chat_model"
        ):
            temp_source_location: Path = (
                SETTINGS.file_upload_temp_location / "ragas_test"
            )

            local_data_source_config: QACatalogGeneratorDataSourceConfig = (
                QACatalogGeneratorDataSourceConfig(
                    type="RAGAS",
                    data_source_location=temp_source_location,
                    data_source_glob=["**/*.txt"],
                )
            )
            generator = RagasQACatalogGenerator(
                config, local_data_source_config, ragas_model_config
            )
            yield generator

    return _func


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "model_config",
    ["ragas_model_config", "normal_model_config"],
)
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.RagasQACatalogGenerator.load_chat_model"
)
async def test_init_ragas_generator_from_config_successfully(
    _: MagicMock,
    config: RagasQACatalogGeneratorConfig,
    data_source_config: QACatalogGeneratorDataSourceConfig,
    model_config: str,
    request: pytest.FixtureRequest,
) -> None:
    generator = RagasQACatalogGenerator(
        config,
        data_source_config,
        request.getfixturevalue(model_config),  # type: ignore
    )

    assert generator.config == config
    assert generator.data_source_config == data_source_config
    assert generator.llm is not None


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.RagasQACatalogGenerator.load_chat_model"
)
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.DirectoryLoader")
async def test_ragas_generator__load_and_process_documents_correctly(
    mock_DirectoryLoader: MagicMock,
    _: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        mock_DirectoryLoader.return_value.load.return_value = [
            Document(page_content="doc1", metadata={"source": "doc1"}),
            Document(page_content="doc2", metadata={"source": "doc2"}),
        ]

        documents = generator._load_and_process_documents()

        assert len(documents) == 2
        assert documents[0].page_content == "doc1"
        assert documents[0].metadata["source"] == "doc1"


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.RagasQACatalogGenerator.load_chat_model"
)
async def test_init_ragas_generator_fails_for_empty_query_distribution(
    _: MagicMock,
    config: RagasQACatalogGeneratorConfig,
    data_source_config: QACatalogGeneratorDataSourceConfig,
    ragas_model_config: RagasQACatalogGeneratorModelConfig,
) -> None:
    with pytest.raises(ValueError, match="At least one query synthesizer"):
        config.query_distribution = []
        RagasQACatalogGenerator(config, data_source_config, ragas_model_config)


@pytest.mark.asyncio
async def test_ragas_generator_create_document_nodes(
    ragas_generator_factory: RagasGeneratorFactory,
    documents: list[Document],
    filenames: list[str],
) -> None:
    with ragas_generator_factory() as generator:
        nodes = generator._create_knowledge_graph_nodes(documents)

        assert len(nodes) == len(documents)
        assert all(
            node.properties["document_metadata"]["source"] == file
            for node, file in zip(nodes, filenames)
        )


@pytest.mark.asyncio
async def test_ragas_generator_has_same_nodes(
    ragas_generator_factory: RagasGeneratorFactory,
    documents: list[Document],
) -> None:
    with ragas_generator_factory() as generator:
        shuffle(documents)
        nodes1 = generator._create_knowledge_graph_nodes(documents)
        shuffle(documents)
        nodes2 = generator._create_knowledge_graph_nodes(documents)

        assert generator._has_same_nodes(nodes1, nodes2)

        shuffle(documents)
        documents[0].page_content = "modified content"
        nodes3 = generator._create_knowledge_graph_nodes(documents)

        assert not generator._has_same_nodes(nodes1, nodes3)


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_create_knowledge_graph_new_successfully(
    mock_knowledge_graph: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
    documents: list[Document],
    nodes: list[Node],
) -> None:
    with ragas_generator_factory() as generator:
        generator._load_and_process_documents = MagicMock(return_value=documents)
        generator._create_knowledge_graph_nodes = MagicMock(return_value=nodes)
        generator.split_documents = MagicMock(return_value=documents)
        generator.apply_knowledge_graph_transformations = MagicMock()

        created_kg = mock_knowledge_graph(nodes=nodes)
        mock_knowledge_graph.return_value = created_kg

        kg = generator.create_knowledge_graph()

        generator._load_and_process_documents.assert_called_once()
        generator.split_documents.assert_called_once_with(documents)
        generator._create_knowledge_graph_nodes.assert_called_once_with(documents)
        mock_knowledge_graph.assert_called_with(nodes=nodes)
        generator.apply_knowledge_graph_transformations.assert_called_once_with(
            created_kg
        )
        assert kg is not None


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_create_knowledge_graph_use_existing_graph_when_nodes_are_same(  # noqa: E501
    mock_knowledge_graph: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
    documents: list[Document],
    nodes: list[Node],
) -> None:
    with ragas_generator_factory() as generator:
        generator._load_and_process_documents = MagicMock(return_value=documents)
        generator._create_knowledge_graph_nodes = MagicMock(return_value=nodes)
        generator.split_documents = MagicMock(return_value=documents)
        generator.config.knowledge_graph_location = None
        generator.apply_knowledge_graph_transformations = MagicMock(return_value=None)
        generated_graph = MagicMock(name="generated_graph")
        mock_knowledge_graph.return_value = generated_graph

        kg: MagicMock = generator.create_knowledge_graph()  # type: ignore

        assert kg is not None
        assert kg == generated_graph


@pytest.mark.asyncio
async def test_ragas_generator_create_knowledge_graph_fails_on_empty_documents(
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator._load_and_process_documents = MagicMock(return_value=[])

        # should raise runtime error
        with pytest.raises(RuntimeError, match="No documents found"):
            generator.create_knowledge_graph()


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_load_knowledge_graph(
    mock_knowledge_graph: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator.config.knowledge_graph_location = MagicMock()
        generator.config.knowledge_graph_location.exists = MagicMock(return_value=True)
        loaded_graph = MagicMock(name="existing_graph")
        mock_knowledge_graph.load.return_value = loaded_graph

        # Create proper mock documents with required attributes
        mock_doc = MagicMock()
        mock_doc.page_content = "test content"
        mock_doc.metadata = {"source": "test.txt"}
        docs = [mock_doc]

        # Mock _has_same_nodes to return True so the loaded graph is returned
        generator._has_same_nodes = MagicMock(return_value=True)

        kg = generator.load_exiting_knowledge_graph(docs)

        mock_knowledge_graph.load.assert_called_once_with(
            generator.config.knowledge_graph_location
        )
        assert kg is loaded_graph


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_load_knowledge_graph_fails_on_non_existent_file(
    mock_knowledge_graph: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator.config.knowledge_graph_location = MagicMock()
        generator.config.knowledge_graph_location.exists = MagicMock(return_value=False)

        docs = [MagicMock()]  # Mock documents
        kg = generator.load_exiting_knowledge_graph(docs)

        assert kg is None


@pytest.mark.asyncio
async def test_ragas_generator_load_knowledge_graph_fails_on_none_location(
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator.config.knowledge_graph_location = None

        docs = [MagicMock()]  # Mock documents
        kg = generator.load_exiting_knowledge_graph(docs)

        assert kg is None


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.RagasQACatalogGenerator.load_chat_model"
)
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_load_knowledge_graph_fails_on_load(
    mock_knowledge_graph: MagicMock,
    _: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator.config.knowledge_graph_location = MagicMock()
        generator.config.knowledge_graph_location.exists = MagicMock(return_value=True)
        mock_knowledge_graph.load.side_effect = RuntimeError("Load failed")

        # Create proper mock documents with required attributes
        mock_doc = MagicMock()
        mock_doc.page_content = "test content"
        mock_doc.metadata = {"source": "test.txt"}
        docs = [mock_doc]

        kg = generator.load_exiting_knowledge_graph(docs)

        mock_knowledge_graph.load.assert_called_once_with(
            generator.config.knowledge_graph_location
        )
        assert kg is None


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.generator.implementation.ragas.generator.KnowledgeGraph")
async def test_ragas_generator_generate_testset(
    mock_knowledge_graph: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        generator.create_knowledge_graph = MagicMock()
        generator.llm.generate = MagicMock(return_value=["generated query"])

        mock_testset_generator = MagicMock()
        mock_testset_generator.generate.return_value = ["generated query"]

        # Provide a non-empty query distribution
        mock_synthesizer = MagicMock()
        query_distribution = [(mock_synthesizer, 1.0)]

        testset = generator.generate_testset(
            mock_testset_generator, 1, query_distribution
        )

        assert testset[0] == "generated query"  # type: ignore


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.ragas_sample_to_synthetic_qa_pair"
)
@patch("ragas.testset.persona.generate_personas_from_kg")
async def test_ragas_generator_a_create_synthetic_qa_successfull(
    mock_generate_personas: MagicMock,
    mock_ragas_sample_to_qa_pair: MagicMock,
    ragas_generator_factory: RagasGeneratorFactory,
) -> None:
    with ragas_generator_factory() as generator:
        # Mock knowledge graph
        mock_kg = MagicMock()
        mock_kg.nodes = []
        generator.create_knowledge_graph = MagicMock(return_value=mock_kg)

        # Mock personas
        mock_persona = MagicMock()
        mock_generate_personas.return_value = [mock_persona]

        # Mock query distribution
        mock_synthesizer = MagicMock()
        generator.create_query_distribution = MagicMock(
            return_value=[(mock_synthesizer, 1.0)]
        )

        # Mock testset generation
        mock_testset = MagicMock()
        mock_sample = MagicMock()
        mock_testset.samples = [mock_sample]
        generator.generate_testset = MagicMock(return_value=mock_testset)

        # Mock conversion to SyntheticQAPair
        synthetic_qa_pair = SyntheticQAPair(
            id="1",
            question="test question",
            expected_output="test answer",
            contexts=[],
            meta_data={},
        )
        mock_ragas_sample_to_qa_pair.return_value = synthetic_qa_pair

        # Collect samples
        collected_samples = []

        async def collect_samples_fn(samples: list[SyntheticQAPair]) -> None:
            collected_samples.extend(samples)

        # Test the method
        await generator.a_create_synthetic_qa(collect_samples_fn)

        # Verify results
        assert len(collected_samples) == 1
        assert collected_samples[0] == synthetic_qa_pair


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.num_tokens_from_string",
)
@patch(
    "llm_eval.qa_catalog.generator.implementation.ragas.generator.RecursiveCharacterTextSplitter"
)
async def test_ragas_generator_splits_large_documents_correctly(
    mock_splitter: MagicMock,
    mock_num_tokens_from_string: MagicMock,
) -> None:
    token_length = 100_004
    chunk_size = token_length / 2
    chunk_overlap = chunk_size / 2

    docs = [Document(page_content="doc1")]
    splitted_docs = [
        Document(page_content="doc1 part 1"),
        Document(page_content="doc1 part 2"),
    ]
    mock_splitter.return_value.split_documents.return_value = splitted_docs

    def mock_len(text: str) -> int:
        if text == "doc1":
            return token_length
        return len(text)

    mock_num_tokens_from_string.side_effect = mock_len

    split_documents_result = RagasQACatalogGenerator.split_documents(docs)

    assert split_documents_result == splitted_docs
    assert mock_num_tokens_from_string.call_count == (len(docs) + len(splitted_docs)), (
        "Every doc should be counted once"
    )
    mock_splitter.assert_called_with(
        chunk_size=chunk_size,
        chunk_overlap=chunk_overlap,
        length_function=mock_num_tokens_from_string,
    )
