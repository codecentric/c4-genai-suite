import shutil

from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    QACatalog,
    QACatalogGeneratorTempDataSourceConfig,
    QACatalogStatus,
)
from llm_eval.llm_endpoints.db.find_llm_endpoint import find_llm_endpoint
from llm_eval.qa_catalog.db.crud_data_source_config import (
    delete_data_source_config,
    find_data_source_config,
)
from llm_eval.qa_catalog.db.find_qa_catalog import find_qa_catalog
from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    get_catalog_generator_class,
)
from llm_eval.qa_catalog.generator.interface import (
    AsyncQACatalogGeneratorSupport,
    QACatalogGenerator,
    QACatalogGeneratorConfig,
    QACatalogGeneratorDataSourceConfig,
    QACatalogGeneratorModelConfigSchema,
    SyncQACatalogGeneratorSupport,
)
from llm_eval.qa_catalog.logic.create_qa_catalog import (
    store_qa_pairs,
)
from llm_eval.qa_catalog.logic.utils import synthethic_qa_pairs_to_db_models
from llm_eval.qa_catalog.models import QACatalogGenerationData
from llm_eval.qa_catalog.synthetic_qa_pair import SyntheticQAPair


async def _generate_catalog_from_config(
    db: AsyncSession,
    qa_catalog: QACatalog,
    config: QACatalogGeneratorConfig,
    model_config_schema: QACatalogGeneratorModelConfigSchema,
    data_source_config: QACatalogGeneratorDataSourceConfig,
) -> None:
    try:
        generator_cls: type[QACatalogGenerator] = get_catalog_generator_class(  # type: ignore
            config.type
        )

        endpoint_fields = filter(
            lambda v: v[0] != "type", model_config_schema.model_dump().items()
        )

        model_config_kwargs = {
            "type": model_config_schema.type,
        }
        for key, value in endpoint_fields:
            llm_endpoint = await find_llm_endpoint(db, value)
            if not llm_endpoint:
                raise ValueError("llm endpoint invalid")
            model_config_kwargs[key] = llm_endpoint  # type: ignore

        model_config = generator_cls.create_model_configuration_from_kwargs(
            model_config_kwargs
        )

        generator = generator_cls(  # type: ignore
            config, data_source_config, model_config
        )

        if isinstance(generator, AsyncQACatalogGeneratorSupport):

            async def collect_samples(samples: list[SyntheticQAPair]) -> None:
                if samples:
                    store_qa_pairs(
                        db,
                        synthethic_qa_pairs_to_db_models(samples, qa_catalog.id),
                    )

            await generator.a_create_synthetic_qa(collect_samples)

        elif isinstance(generator, SyncQACatalogGeneratorSupport):
            qa_pairs = generator.create_synthetic_qa()
            store_qa_pairs(
                db,
                synthethic_qa_pairs_to_db_models(qa_pairs, qa_catalog.id),
            )
        else:
            raise RuntimeError(f"{generator} doesnt support sync/async qa generation")

        qa_catalog.status = QACatalogStatus.READY
    except Exception as e:
        logger.error(f"Error generating qa pairs for {qa_catalog.id}\nError: {e}")
        qa_catalog.status = QACatalogStatus.FAILURE
        qa_catalog.error = repr(e)


async def generation_cleanup(
    db: AsyncSession, temp_data_source_config: QACatalogGeneratorTempDataSourceConfig
) -> None:
    data_source_config = QACatalogGeneratorDataSourceConfig.from_db_json(
        temp_data_source_config.config
    )

    # delete stored temp directory for the generation
    shutil.rmtree(data_source_config.data_source_location)

    await delete_data_source_config(db, temp_data_source_config)


async def generate_catalog(
    db: AsyncSession, catalog_id: str, data: QACatalogGenerationData
) -> None:
    qa_catalog = await find_qa_catalog(db, catalog_id)
    temp_data_source_config = await find_data_source_config(
        db, data.data_source_config_id
    )

    if qa_catalog:
        if not temp_data_source_config:
            qa_catalog.status = QACatalogStatus.FAILURE
            qa_catalog.error = (
                "Given data source config with id"
                f"{data.data_source_config_id} couldn't be found"
            )
        else:
            try:
                data_source_config = QACatalogGeneratorDataSourceConfig.from_db_json(
                    temp_data_source_config.config
                )
                await _generate_catalog_from_config(
                    db,
                    qa_catalog,
                    data.config,
                    data.model_config_schema,
                    data_source_config,
                )
                await generation_cleanup(db, temp_data_source_config)  # noqa: F821
            except Exception as e:
                logger.error(
                    f"Error generating qa pairs for {qa_catalog.id}\nError: {e}"
                )
                qa_catalog.status = QACatalogStatus.FAILURE
                qa_catalog.error = repr(e)
