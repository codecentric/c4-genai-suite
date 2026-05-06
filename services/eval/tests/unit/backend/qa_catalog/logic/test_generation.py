from abc import ABC
from contextlib import contextmanager
from pathlib import Path
from typing import Any, Awaitable, Callable, ContextManager
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import UploadFile

from llm_eval.database.model import (
    QACatalog,
    QACatalogGeneratorTempDataSourceConfig,
    QACatalogStatus,
)
from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    QACatalogGeneratorType,
    active_generator_types,
)
from llm_eval.qa_catalog.generator.implementation.ragas.config import (
    RagasQACatalogGeneratorConfig,
    RagasQACatalogGeneratorPersona,
    RagasQACatalogQuerySynthesizer,
)
from llm_eval.qa_catalog.generator.interface import (
    AsyncQACatalogGeneratorSupport,
    QACatalogGeneratorConfig,
    QACatalogGeneratorDataSourceConfig,
    QACatalogGeneratorModelConfigSchema,
    SyncQACatalogGeneratorSupport,
)
from llm_eval.qa_catalog.logic.generation import (
    _generate_catalog_from_config,
    generate_catalog,
    generation_cleanup,
)
from llm_eval.qa_catalog.logic.upload import (
    create_qa_catalog_data_source_config,
)
from llm_eval.qa_catalog.logic.utils import synthethic_qa_pairs_to_db_models
from llm_eval.qa_catalog.models import QACatalogGenerationData
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


@pytest.fixture
def qa_catalog() -> QACatalog:
    return QACatalog(
        id="test-catalog-id",
        status=QACatalogStatus.GENERATING,
        error=None,
        qa_catalog_group_id="group-id-1",
    )


@pytest.fixture(params=active_generator_types)
def generator_type(request: pytest.FixtureRequest) -> QACatalogGeneratorType:
    return request.param


@pytest.fixture
def data_source_config(
    generator_type: QACatalogGeneratorType,
) -> QACatalogGeneratorDataSourceConfig:
    return QACatalogGeneratorDataSourceConfig(
        type=generator_type,
        data_source_location=Path("/tmp/test"),
        data_source_glob=["**/*.txt"],
    )


@pytest.fixture
def temp_data_source_config(
    data_source_config: QACatalogGeneratorDataSourceConfig,
) -> QACatalogGeneratorTempDataSourceConfig:
    return QACatalogGeneratorTempDataSourceConfig(
        id="test-datasource-config-id",
        config=data_source_config.to_db_json(),
    )


@pytest.fixture
def catalog_generator_config(
    generator_type: QACatalogGeneratorType,
) -> QACatalogGeneratorConfig:
    match generator_type:
        case "RAGAS":
            return RagasQACatalogGeneratorConfig(
                type=generator_type,
                sample_count=10,
                knowledge_graph_location=None,
                query_distribution=[
                    RagasQACatalogQuerySynthesizer.SINGLE_HOP_SPECIFIC,
                ],
                personas=[
                    RagasQACatalogGeneratorPersona(
                        name="test-persona", description="test description"
                    ),
                ],
            )
        case _:
            raise RuntimeError("this should never happen")


@pytest.fixture
def catalog_generation_data(
    generator_type: QACatalogGeneratorType,
    catalog_generator_config: QACatalogGeneratorConfig,
) -> QACatalogGenerationData:
    return QACatalogGenerationData(
        type=generator_type,
        name="test-catalog",
        config=catalog_generator_config,  # type: ignore
        model_config_schema=QACatalogGeneratorModelConfigSchema(  # type: ignore
            type=generator_type,
            llm_endpoint="test-endpoint",
        ),
        data_source_config_id="test-datasource-config-id",
    )


MockSessionLocal = Callable[[], ContextManager[AsyncMock]]


@pytest.fixture
def session_local() -> MockSessionLocal:
    @contextmanager
    def _func():  # noqa: ANN202
        mock_session = AsyncMock()
        yield mock_session

    return _func


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.generation.find_qa_catalog")
@patch("llm_eval.qa_catalog.logic.generation.find_data_source_config")
@patch("llm_eval.qa_catalog.logic.generation._generate_catalog_from_config")
@patch("llm_eval.qa_catalog.logic.generation.generation_cleanup")
async def test_generate_catalog_task_happy_path(
    mock_generation_cleanup: AsyncMock,
    mock_generate_catalog: AsyncMock,
    mock_find_data_source_config: AsyncMock,
    mock_find_qa_catalog: AsyncMock,
    session_local: AsyncMock,
    qa_catalog: QACatalog,
    temp_data_source_config: QACatalogGeneratorTempDataSourceConfig,
    catalog_generation_data: QACatalogGenerationData,
) -> None:
    with session_local() as mock_session:
        mock_find_qa_catalog.return_value = qa_catalog
        mock_find_data_source_config.return_value = temp_data_source_config

        await generate_catalog(mock_session, qa_catalog.id, catalog_generation_data)

        mock_find_qa_catalog.assert_called_once_with(mock_session, qa_catalog.id)
        mock_find_data_source_config.assert_called_once_with(
            mock_session, temp_data_source_config.id
        )

        mock_generate_catalog.assert_called_once()
        args, _ = mock_generate_catalog.call_args
        assert args[0] == mock_session
        assert args[1] == qa_catalog
        assert args[2] == catalog_generation_data.config
        assert args[3] == catalog_generation_data.model_config_schema
        assert isinstance(args[4], QACatalogGeneratorDataSourceConfig)

        mock_generation_cleanup.assert_called_once_with(
            mock_session, temp_data_source_config
        )

        assert qa_catalog.status != QACatalogStatus.FAILURE


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.generation.find_qa_catalog")
@patch("llm_eval.qa_catalog.logic.generation.find_data_source_config")
@patch("llm_eval.qa_catalog.logic.generation._generate_catalog_from_config")
@patch("llm_eval.qa_catalog.logic.generation.generation_cleanup")
async def test_generate_catalog_task_temp_data_source_config_not_found(
    mock_generation_cleanup: AsyncMock,
    mock_generate_catalog: AsyncMock,
    mock_find_data_source_config: AsyncMock,
    mock_find_qa_catalog: AsyncMock,
    session_local: MagicMock,
    qa_catalog: QACatalog,
    temp_data_source_config: QACatalogGeneratorTempDataSourceConfig,
    catalog_generation_data: QACatalogGenerationData,
) -> None:
    with session_local() as mock_session:
        mock_find_qa_catalog.return_value = qa_catalog
        mock_find_data_source_config.return_value = None

        await generate_catalog(mock_session, qa_catalog.id, catalog_generation_data)

        mock_find_qa_catalog.assert_called_once_with(mock_session, qa_catalog.id)
        mock_find_data_source_config.assert_called_once_with(
            mock_session, temp_data_source_config.id
        )

        mock_generate_catalog.assert_not_called()
        mock_generation_cleanup.assert_not_called()

        assert qa_catalog.status == QACatalogStatus.FAILURE


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.generation.shutil.rmtree")
@patch("llm_eval.qa_catalog.logic.generation.delete_data_source_config")
async def test_generation_cleanup_success(
    mock_delete_data_source_config: AsyncMock,
    mock_rmtree: MagicMock,
    temp_data_source_config: QACatalogGeneratorTempDataSourceConfig,
    data_source_config: QACatalogGeneratorDataSourceConfig,
) -> None:
    """Test that generation_cleanup correctly cleans up resources."""
    mock_session = AsyncMock()
    mock_delete_data_source_config.return_value = None

    await generation_cleanup(mock_session, temp_data_source_config)

    mock_rmtree.assert_called_once_with(data_source_config.data_source_location)

    mock_delete_data_source_config.assert_called_once_with(
        mock_session, temp_data_source_config
    )


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.logic.upload._store_in_tmp",
    return_value=(Path("test_location"), ["**/*.txt"]),
)  # noqa: E501
@patch("llm_eval.qa_catalog.logic.upload.create_temp_data_source_config")
async def test_create_qa_catalog_data_source_config_success(
    mock_create_temp_data_source_config: AsyncMock,
    mock_store_in_tmp: MagicMock,
    session_local: MockSessionLocal,
    generator_type: QACatalogGeneratorType,
) -> None:
    with session_local() as mock_session:
        mock_files: list[UploadFile] = [
            MagicMock(name="file1", spec=UploadFile),
            MagicMock(name="file2", spec=UploadFile),
        ]
        await create_qa_catalog_data_source_config(
            mock_session, mock_files, generator_type
        )

        mock_store_in_tmp.assert_called_once_with(mock_files)

        args, _ = mock_create_temp_data_source_config.call_args
        assert args[0] == mock_session

        config = args[1]
        assert config.data_source_location == Path("test_location")
        assert config.data_source_glob == ["**/*.txt"]
        assert config.type == generator_type


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "GeneratorSupportTypeInterface",
    [
        AsyncQACatalogGeneratorSupport,
        SyncQACatalogGeneratorSupport,
    ],
)
@patch(
    "llm_eval.qa_catalog.logic.generation.find_llm_endpoint",
    new_callable=AsyncMock,
)
@patch("llm_eval.qa_catalog.logic.generation.get_catalog_generator_class")
@patch("llm_eval.qa_catalog.logic.generation.store_qa_pairs")
@patch("llm_eval.qa_catalog.logic.generation.synthethic_qa_pairs_to_db_models")
async def test_generate_catalog_from_config_success(
    mock_synthethic_qa_pairs_to_db_models: MagicMock,
    mock_store_qa_pairs: AsyncMock,
    mock_get_generator: MagicMock,
    mock_find_llm_endpoint: AsyncMock,
    GeneratorSupportTypeInterface: type[ABC],
    session_local: MockSessionLocal,
    qa_catalog: QACatalog,
    generator_type: QACatalogGeneratorType,
) -> None:
    dummy_pair = SyntheticQAPair(
        id="dummy_pair_id",
        question="dummy_question",
        expected_output="dummy_answer",
        contexts=["dummy_context"],
        meta_data={},
    )
    dummy_db_pairs = synthethic_qa_pairs_to_db_models([dummy_pair], qa_catalog.id)
    mock_synthethic_qa_pairs_to_db_models.return_value = dummy_db_pairs

    class DummyGenerator(GeneratorSupportTypeInterface):
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.args = args
            self.kwargs = kwargs

        @classmethod
        def create_model_configuration_from_kwargs(
            cls, kwargs: dict[str, Any]
        ) -> dict[str, Any]:
            return kwargs

        async def a_create_synthetic_qa(
            self,
            process_samples: Callable[[list[SyntheticQAPair]], Awaitable[Any]],
        ) -> None:
            await process_samples([dummy_pair])

        def create_synthetic_qa(self) -> list[SyntheticQAPair]:
            return [dummy_pair]

    mock_get_generator.return_value = DummyGenerator
    mock_find_llm_endpoint.return_value = "fake_endpoint"

    type_str = generator_type
    dummy_model_schema: MagicMock = MagicMock()
    dummy_model_schema.model_dump.return_value = {
        "type": type_str,
        "llm_endpoint": "fake_endpoint_id",
    }
    dummy_model_schema.type = type_str

    dummy_config: MagicMock = MagicMock()
    dummy_config.type = type_str
    dummy_data_source_config: MagicMock = MagicMock()

    with session_local() as mock_session:
        await _generate_catalog_from_config(
            mock_session,
            qa_catalog,
            dummy_config,
            dummy_model_schema,
            dummy_data_source_config,
        )

        assert qa_catalog.status == QACatalogStatus.READY
        mock_store_qa_pairs.assert_called_with(mock_session, dummy_db_pairs)


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.logic.generation.find_llm_endpoint",
    new_callable=AsyncMock,
)
@patch("llm_eval.qa_catalog.logic.generation.store_qa_pairs")
@patch("llm_eval.qa_catalog.logic.generation.get_catalog_generator_class")
async def test_generate_catalog_from_config_fails_for_unsupported_generator(
    mock_get_generator: MagicMock,
    mock_add_qa_pairs: AsyncMock,
    mock_find_llm_endpoint: AsyncMock,
    session_local: MockSessionLocal,
    qa_catalog: QACatalog,
    generator_type: QACatalogGeneratorType,
) -> None:
    class UnsupportedGenerator:
        def __init__(self, *args: Any, **kwargs: Any) -> None:
            self.args = args
            self.kwargs = kwargs

        @classmethod
        def create_model_configuration_from_kwargs(
            cls, kwargs: dict[str, Any]
        ) -> dict[str, Any]:
            return kwargs

        def __str__(self) -> str:
            return "UnsupportedGenerator"

    mock_get_generator.return_value = UnsupportedGenerator
    mock_find_llm_endpoint.return_value = "fake_endpoint"

    type_str = generator_type
    dummy_model_schema: MagicMock = MagicMock()
    dummy_model_schema.model_dump.return_value = {
        "type": type_str,
        "llm_endpoint": "fake_endpoint_id",
    }
    dummy_model_schema.type = type_str

    dummy_config: MagicMock = MagicMock()
    dummy_config.type = type_str
    dummy_data_source_config: MagicMock = MagicMock()

    with session_local() as mock_session:
        await _generate_catalog_from_config(
            mock_session,
            qa_catalog,
            dummy_config,
            dummy_model_schema,
            dummy_data_source_config,
        )

        assert qa_catalog.status == QACatalogStatus.FAILURE
        assert (
            qa_catalog.error
            == "RuntimeError('UnsupportedGenerator doesnt support sync/async qa generation')"  # noqa: E501
        )
        mock_add_qa_pairs.assert_not_called()


@pytest.mark.asyncio
@patch(
    "llm_eval.qa_catalog.logic.generation.find_llm_endpoint",
    new_callable=AsyncMock,
)
@patch("llm_eval.qa_catalog.logic.generation.get_catalog_generator_class")
async def test_generate_catalog_from_config_invalid_llm_endpoint(
    mock_get_generator: MagicMock,
    mock_find_llm_endpoint: AsyncMock,
    session_local: MockSessionLocal,
    qa_catalog: QACatalog,
    generator_type: QACatalogGeneratorType,
) -> None:
    mock_get_generator.return_value = MagicMock()
    mock_find_llm_endpoint.return_value = None

    dummy_model_schema: MagicMock = MagicMock()
    dummy_model_schema.model_dump.return_value = {
        "type": generator_type,
        "llm_endpoint": "fake_endpoint",
    }

    dummy_config: MagicMock = MagicMock()
    dummy_data_source_config: MagicMock = MagicMock()

    with session_local() as mock_session:
        await _generate_catalog_from_config(
            mock_session,
            qa_catalog,
            dummy_config,
            dummy_model_schema,
            dummy_data_source_config,
        )

        assert qa_catalog.status == QACatalogStatus.FAILURE
        assert qa_catalog.error == "ValueError('llm endpoint invalid')"
