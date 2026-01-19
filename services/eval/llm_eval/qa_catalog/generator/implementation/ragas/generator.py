import inspect
import math
from hashlib import md5
from typing import Callable, Coroutine, get_args, override

from langchain_community.document_loaders import DirectoryLoader
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from loguru import logger
from pydantic import ValidationError
from ragas.embeddings import LangchainEmbeddingsWrapper
from ragas.testset import TestsetGenerator
from ragas.testset import persona as ragas_persona
from ragas.testset.graph import KnowledgeGraph, Node, NodeType
from ragas.testset.synthesizers import (
    BaseSynthesizer,
    MultiHopAbstractQuerySynthesizer,
    MultiHopSpecificQuerySynthesizer,
    SingleHopSpecificQuerySynthesizer,
)
from ragas.testset.synthesizers.generate import LangchainLLMWrapper
from ragas.testset.synthesizers.testset_schema import Testset
from ragas.testset.transforms import (
    EmbeddingExtractor,
    HeadlinesExtractor,
    HeadlineSplitter,
    KeyphrasesExtractor,
    SummaryExtractor,
    apply_transforms,
)
from ragas.testset.transforms.default import (
    NERExtractor,
    num_tokens_from_string,
)
from typing_extensions import deprecated

from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    QACatalogGeneratorType,
    RagasGeneratorType,
)
from llm_eval.qa_catalog.generator.implementation.ragas.config import (
    RagasQACatalogGeneratorConfig,
    RagasQACatalogGeneratorModelConfig,
    RagasQACatalogQuerySynthesizer,
)
from llm_eval.qa_catalog.generator.implementation.ragas.helper import (
    ragas_sample_to_synthetic_qa_pair,
)
from llm_eval.qa_catalog.generator.interface import (
    AsyncQACatalogGeneratorSupport,
    QACatalogGenerator,
    QACatalogGeneratorDataSourceConfig,
    QACatalogGeneratorLocalModelConfig,
)
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair
from llm_eval.settings import SETTINGS
from llm_eval.utils.decorators import retry_on_error
from llm_eval.utils.mixed_document_loader import MixedDocumentLoader
from llm_eval.utils.model_settings.azure_ai_model_settings import AzureAiModelSettings

query_synthesizer_classes: dict[
    RagasQACatalogQuerySynthesizer, type[BaseSynthesizer]
] = {
    RagasQACatalogQuerySynthesizer.SINGLE_HOP_SPECIFIC: SingleHopSpecificQuerySynthesizer,  # noqa: E501
    RagasQACatalogQuerySynthesizer.MULTI_HOP_SPECIFIC: MultiHopSpecificQuerySynthesizer,
    RagasQACatalogQuerySynthesizer.MULTI_HOP_ABSTRACT: MultiHopAbstractQuerySynthesizer,
}

query_synthesizer_classes_reverse: dict[
    type[BaseSynthesizer], RagasQACatalogQuerySynthesizer
] = {v: k for k, v in query_synthesizer_classes.items()}


def has_parameter(cls: type, param_name: str) -> bool:
    """Check if a class constructor has a specific parameter."""
    try:
        signature = inspect.signature(cls.__init__)
        return param_name in signature.parameters
    except Exception:
        return False


class RagasQACatalogGenerator(
    QACatalogGenerator[
        RagasGeneratorType,
        RagasQACatalogGeneratorConfig,
        QACatalogGeneratorDataSourceConfig,
        RagasQACatalogGeneratorModelConfig | QACatalogGeneratorLocalModelConfig,
    ],
    AsyncQACatalogGeneratorSupport,
):
    generator_type: QACatalogGeneratorType = get_args(RagasGeneratorType)[0]

    @override
    def __init__(
        self,
        config: RagasQACatalogGeneratorConfig,
        data_source_config: QACatalogGeneratorDataSourceConfig,
        model_config: (
            RagasQACatalogGeneratorModelConfig | QACatalogGeneratorLocalModelConfig
        ),
    ) -> None:
        super().__init__(config, data_source_config, model_config)
        if isinstance(model_config, RagasQACatalogGeneratorModelConfig):
            self.llm = LangchainLLMWrapper(
                self.load_chat_model(model_config.llm_endpoint)
            )
        else:
            self.llm = LangchainLLMWrapper(model_config.llm)

        try:
            azure_settings = AzureAiModelSettings()  # type: ignore
        except ValidationError:
            _msg = "Invalid Azure OpenAI configuration for Ragas, see .env.example"
            logger.error(_msg)
            raise RuntimeError(_msg)

        self.embeddings = LangchainEmbeddingsWrapper(azure_settings.to_embeddings())
        if (
            not self.config.knowledge_graph_location
            and self.config.use_existing_knowledge_graph
        ):
            self.config.knowledge_graph_location = (
                SETTINGS.file_upload_temp_location / "knowledge_graph_ragas.json"
            )

        self.validate_config()

        self.personas = (
            [
                ragas_persona.Persona(name=p.name, role_description=p.description)
                for p in self.config.personas
            ]
            if self.config.personas
            else None
        )

    def validate_config(self) -> None:
        if not self.config.query_distribution:
            raise ValueError(
                "At least one query synthesizer must be selected for QA generation"
            )

    def _load_and_process_documents(self) -> list[Document]:
        """
        Loads and processes documents.
        Returns:
            A list of processed documents split by pages.
        """
        loader = DirectoryLoader(
            str(self.data_source_config.data_source_location),
            show_progress=True,
            glob=self.data_source_config.data_source_glob,
            loader_cls=MixedDocumentLoader,  # type: ignore
        )
        docs = loader.load()
        return docs

    def _create_knowledge_graph_nodes(
        self,
        docs: list[Document],
        node_type: NodeType = NodeType.DOCUMENT,
    ) -> list[Node]:
        return [
            Node(
                type=node_type,
                properties={
                    "page_content": doc.page_content,
                    "document_metadata": doc.metadata,
                    # nosemgrep
                    "page_hash": md5(
                        bytes(doc.page_content, encoding="utf-8")
                    ).hexdigest(),
                },
            )
            for doc in docs
        ]

    def _has_same_nodes(self, n1: list[Node], n2: list[Node]) -> bool:
        """
        Compares the nodes of given to knowledge graphs
        """

        def _sort(nodes: list[Node]) -> list[str]:
            # sort nodes by each pages hash
            return sorted(
                set(
                    filter(
                        lambda x: x,
                        map(lambda n: n.properties.get("page_hash", ""), nodes),
                    )
                )
            )

        _1 = _sort(n1)
        _2 = _sort(n2)

        return _1 == _2

    @staticmethod
    def split_documents(
        docs: list[Document],
    ) -> list[Document]:
        """
        A preprocessing step for ragas's default transforms.
        It cannot handle documents with token count > 100k
        Therefore if the document is large enough, we split it into proper subdocuments.

        """

        def _split(doc: Document, token_length: int) -> list[Document]:
            chunk_size = math.ceil(token_length / 2)
            chunk_overlap = math.ceil(chunk_size * 0.5)
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=chunk_size,
                chunk_overlap=chunk_overlap,
                length_function=num_tokens_from_string,
            )
            return splitter.split_documents([doc])

        _docs = []
        split_occurred = False
        for doc in docs:
            token_length = num_tokens_from_string(doc.page_content)
            if token_length > 100_000:
                split_occurred = True
                _docs.extend(_split(doc, token_length))
            else:
                _docs.append(doc)

        if split_occurred:
            return RagasQACatalogGenerator.split_documents(_docs)
        else:
            return _docs

    def apply_knowledge_graph_transformations(
        self,
        knowledge_graph: KnowledgeGraph,
    ) -> None:
        headline_extractor = HeadlinesExtractor(llm=self.llm, max_num=20)
        headline_splitter = HeadlineSplitter(max_tokens=1500, min_tokens=100)
        keyphrase_extractor = KeyphrasesExtractor(llm=self.llm)

        summary = SummaryExtractor(llm=self.llm)
        summary_emb_extractor = EmbeddingExtractor(
            embedding_model=self.embeddings,
            property_name="summary_embedding",
            embed_property_name="summary",
        )

        ner_extractor = NERExtractor(
            llm=self.llm,
            property_name="entities",
        )

        transforms = [
            headline_extractor,
            headline_splitter,
            keyphrase_extractor,
            summary,
            summary_emb_extractor,
            ner_extractor,
        ]

        apply_transforms(knowledge_graph, transforms=transforms)

    def create_knowledge_graph(self) -> KnowledgeGraph:
        """
        Loads the knowledge graph if already exists
        and compares it's nodes with the current documents.
        If the existent graph has these documents
        already it uses the existent knowledge graph
        otherwise create a new knowledge graph out ouf the documents
        """

        docs = self._load_and_process_documents()  # chunks of documents
        if len(docs) == 0:
            raise RuntimeError("No documents found")

        chunks = self.split_documents(docs)
        knowledge_graph = KnowledgeGraph(
            nodes=self._create_knowledge_graph_nodes(chunks),
        )

        self.apply_knowledge_graph_transformations(knowledge_graph)

        return knowledge_graph

    @deprecated("Until we have a better way to handle knowledge graph caching")
    def load_exiting_knowledge_graph(
        self,
        docs: list[Document],
    ) -> KnowledgeGraph | None:
        if not self.config.knowledge_graph_location:
            return None

        if not self.config.knowledge_graph_location.exists():
            logger.info(
                f"No knowledge graph found at {self.config.knowledge_graph_location}"
            )
            return None

        logger.info(f"Knowledge graph found at {self.config.knowledge_graph_location}")
        knowledge_graph = None
        try:
            knowledge_graph = KnowledgeGraph.load(self.config.knowledge_graph_location)
        except Exception as e:
            logger.error(f"Failed to load knowledge graph: {e.__class__.__name__}: {e}")
            self.config.knowledge_graph_location.replace(
                self.config.knowledge_graph_location.absolute().with_suffix(".bak")
            )

        new_nodes = self._create_knowledge_graph_nodes(docs)
        if knowledge_graph and self._has_same_nodes(knowledge_graph.nodes, new_nodes):
            return knowledge_graph

        return None

    def create_query_distribution(
        self,
        knowledge_graph: KnowledgeGraph,
    ) -> list[tuple[BaseSynthesizer, float]]:
        properties = ["headlines", "keyphrases", "entities"]

        selected_synthesizer_classes = (
            query_synthesizer_classes[q] for q in self.config.query_distribution
        )

        synthesizers = []
        for synthesizer_class in selected_synthesizer_classes:
            if has_parameter(synthesizer_class, "property_name"):
                for property_name in properties:
                    synthesizers.append(
                        synthesizer_class(
                            llm=self.llm,
                            property_name=property_name,  # type: ignore
                        )
                    )
            else:
                synthesizers.append(synthesizer_class(llm=self.llm))

        available_queries = []
        for query in synthesizers:
            if query.get_node_clusters(knowledge_graph):
                available_queries.append(query)

        return [(query, 1 / len(available_queries)) for query in available_queries]

    @retry_on_error((Exception,), 3)
    def generate_testset(
        self,
        generator: TestsetGenerator,
        sample_count: int,
        query_distribution: list[tuple[BaseSynthesizer, float]],
    ) -> Testset:
        if len(query_distribution) == 0:
            raise ValueError("No query distribution provided")

        # Given sample count may not match the outputted sample count
        return generator.generate(
            sample_count,
            query_distribution,
        )

    async def a_create_synthetic_qa(
        self,
        collect_samples: Callable[[list[SyntheticQAPair]], Coroutine],
    ) -> None:
        knowledge_graph = self.create_knowledge_graph()

        if not self.personas:
            self.personas = ragas_persona.generate_personas_from_kg(
                knowledge_graph,
                self.llm,
            )
            if not self.personas:
                raise ValueError("Failed to generate personas")

        logger.info(f"Generating {self.config.sample_count} QA pairs")

        generator = TestsetGenerator(
            llm=self.llm,
            embedding_model=self.embeddings,
            knowledge_graph=knowledge_graph,
            persona_list=self.personas,
        )

        query_distribution = self.create_query_distribution(knowledge_graph)

        testset = self.generate_testset(
            generator,
            self.config.sample_count,
            query_distribution,
        )
        if not testset.samples:
            raise ValueError("Empty testset")

        samples: list[SyntheticQAPair] = [
            ragas_sample_to_synthetic_qa_pair(testset_sample)
            for testset_sample in testset.samples
        ]

        await collect_samples(samples)

        logger.info(f"Generated {len(samples)} QA sample sets")

    @override
    @staticmethod
    def create_configuration_from_dict(
        _dict: dict,
    ) -> RagasQACatalogGeneratorConfig:
        return RagasQACatalogGeneratorConfig.model_validate(_dict)

    @override
    @staticmethod
    def create_model_configuration_from_kwargs(
        kwargs: dict,
    ) -> RagasQACatalogGeneratorModelConfig:
        return RagasQACatalogGeneratorModelConfig(**kwargs)
