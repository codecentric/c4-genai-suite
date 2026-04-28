from typing import Annotated

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from llm_eval.database.model import QACatalogStatus
from llm_eval.db import SessionDep
from llm_eval.qa_catalog.db.delete_qa_catalog import delete_qa_catalog
from llm_eval.qa_catalog.db.find_qa_catalog import find_qa_catalog
from llm_eval.qa_catalog.db.find_qa_catalog_by_group import (
    find_qa_catalog_with_latest_revision,
)
from llm_eval.qa_catalog.db.find_qa_catalog_preview import (
    find_qa_catalog_preview,
)
from llm_eval.qa_catalog.db.find_qa_catalog_previews import (
    find_qa_catalog_previews,
)
from llm_eval.qa_catalog.db.find_qa_pairs import find_qa_pairs
from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    QACatalogGeneratorType,
    active_generator_types,
)
from llm_eval.qa_catalog.logic.create_qa_catalog import create_qa_catalog
from llm_eval.qa_catalog.logic.crud_qa_catalog_from_file import (
    create_qa_catalog_from_file,
    update_qa_catalog_from_file,
    update_qa_catalog_from_request,
)
from llm_eval.qa_catalog.logic.download import (
    handle_catalog_download,
)
from llm_eval.qa_catalog.logic.revision_history import (
    create_qa_catalog_revision_history,
)
from llm_eval.qa_catalog.models import (
    ActiveQACatalogGeneratorType,
    DeleteCatalogResult,
    DownloadQACatalogOptions,
    DownloadQACatalogResponse,
    QACatalog,
    QACatalogGenerationData,
    QACatalogGenerationFromC4BucketRequest,
    QACatalogGenerationResult,
    QACatalogPreview,
    QACatalogUpdateRequest,
    QACatalogVersionHistory,
    QAPair,
)
from llm_eval.qa_catalog.tasks.handle_generate_catalog_task import (
    submit_generate_catalog_task,
)
from llm_eval.schemas import GenericError
from llm_eval.utils.api import PaginationParamsDep

router = APIRouter(prefix="/qa-catalog", tags=["qa-catalog"])


@router.get("")
async def get_all(
    db: SessionDep,
    pagination_params: PaginationParamsDep,
    name: str | None = None,
) -> list[QACatalogPreview]:
    return await find_qa_catalog_previews(
        db, pagination_params.limit, pagination_params.offset, name
    )


@router.post("", status_code=201)
async def create_empty(
    db: SessionDep,
    name: str,
) -> QACatalog:
    """Create a new empty QA catalog that can be populated manually."""
    catalog = await create_qa_catalog(db, [], name)
    catalog.status = QACatalogStatus.READY
    return QACatalog.from_db_model(catalog)


@router.post("/upload", status_code=201)
async def upload(
    db: SessionDep,
    file: Annotated[UploadFile, File()],
    name: Annotated[str, Form()],
) -> QACatalog:
    try:
        catalog = await create_qa_catalog_from_file(db, file, name)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

    return QACatalog.from_db_model(catalog)


@router.put("/{catalog_id}/upload", status_code=201)
async def update(
    db: SessionDep,
    file: Annotated[UploadFile, File()],
    catalog_id: str,
) -> QACatalog:
    prev_catalog = await find_qa_catalog(db, catalog_id)
    if prev_catalog is None:
        raise HTTPException(
            status_code=404, detail="Catalog not found, cannot update it"
        )
    try:
        catalog = await update_qa_catalog_from_file(db, file, prev_catalog)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))
    return QACatalog.from_db_model(catalog)


@router.get("/{catalog_id}", responses={404: {"model": GenericError}})
async def get(
    db: SessionDep,
    catalog_id: str,
) -> QACatalog:
    catalog = await find_qa_catalog(db, catalog_id)

    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found.")

    return QACatalog.from_db_model(catalog)


@router.patch("/{catalog_id}", response_model=QACatalog)
async def edit_qa_catalog(
    db: SessionDep, catalog_id: str, update_data: QACatalogUpdateRequest
) -> QACatalog:
    catalog = await find_qa_catalog(db, catalog_id)
    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found")

    return QACatalog.from_db_model(
        await update_qa_catalog_from_request(db, update_data, catalog)
    )


@router.get("/{catalog_id}/preview")
async def get_preview(db: SessionDep, catalog_id: str) -> QACatalogPreview:
    catalog = await find_qa_catalog_preview(db, catalog_id)

    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found.")

    return catalog


@router.delete("/{catalog_id}", responses={404: {"model": GenericError}})
async def delete(
    db: SessionDep,
    catalog_id: str,
) -> DeleteCatalogResult:
    catalog = await find_qa_catalog(db, catalog_id)

    if not catalog:
        raise HTTPException(status_code=404, detail="Catalog not found.")

    await delete_qa_catalog(db, catalog)

    latest_catalog = await find_qa_catalog_with_latest_revision(
        db, catalog.qa_catalog_group_id
    )

    if latest_catalog:
        previous_id = latest_catalog.id
    else:
        previous_id = None

    return DeleteCatalogResult(previous_revision_id=previous_id)


@router.get("/{catalog_id}/qa-pairs")
async def get_catalog_qa_pairs(
    db: SessionDep,
    catalog_id: str,
    pagination_params: PaginationParamsDep,
) -> list[QAPair]:
    qa_pairs = await find_qa_pairs(
        db,
        catalog_id,
        pagination_params.limit,
        pagination_params.offset,
    )

    return [QAPair.model_validate(qa_pair) for qa_pair in qa_pairs]


@router.post("/generator/upload")
async def create_data_source_config(
    db: SessionDep,
    generator_type: Annotated[QACatalogGeneratorType, Form()],
    files: Annotated[list[UploadFile], File(...)],
) -> str:
    from llm_eval.qa_catalog.logic.upload import (
        create_qa_catalog_data_source_config,
    )

    return await create_qa_catalog_data_source_config(db, files, generator_type)


@router.post(
    "/generator/catalog",
    description="Start a new qa catalog generation",
    status_code=201,
)
async def generate(
    db: SessionDep,
    data: QACatalogGenerationData,
) -> QACatalogGenerationResult:
    qa_catalog = await create_qa_catalog(db, [], data.name)

    submit_generate_catalog_task(qa_catalog.id, data)

    return QACatalogGenerationResult(catalog_id=qa_catalog.id)


@router.post(
    "/generator/from-c4-bucket",
    description="Generate QA catalog from files in a C4 bucket",
    status_code=201,
)
async def generate_from_c4_bucket(
    db: SessionDep,
    request: QACatalogGenerationFromC4BucketRequest,
) -> QACatalogGenerationResult:
    """Generate a QA catalog from PDF files stored in a C4 bucket.

    This endpoint downloads PDF files from the configured S3/MinIO file store
    (same storage used by REIS) and generates a QA catalog from them.

    Args:
        db: Database session
        request: Request containing bucket_id, file_ids, catalog name,
            and generation config

    Returns:
        QACatalogGenerationResult with the created catalog ID

    Raises:
        HTTPException: 400 if file store not configured, 404 if files not found
    """
    import os
    from hashlib import md5
    from uuid import uuid4

    from llm_eval.file_store import get_filestore
    from llm_eval.qa_catalog.db.crud_data_source_config import (
        create_temp_data_source_config,
    )
    from llm_eval.qa_catalog.generator.interface import (
        QACatalogGeneratorDataSourceConfig,
    )
    from llm_eval.settings import SETTINGS

    # Get file store adapter
    file_store = get_filestore()
    if file_store is None:
        raise HTTPException(
            status_code=400,
            detail=(
                "File store is not configured. "
                "Please set FILE_STORE_TYPE and related settings."
            ),
        )

    # Create temporary directory for downloaded files
    temp = SETTINGS.file_upload_temp_location
    temp_source_location = temp / str(uuid4())
    os.makedirs(temp_source_location, exist_ok=True)

    try:
        # Download files from S3/MinIO
        for file_id in request.file_ids:
            # Get file content from storage
            file_bytes = await file_store.get(str(file_id))

            # Save to temporary directory with a safe filename
            safe_filename = md5(str(file_id).encode("utf-8")).hexdigest()
            filepath = temp_source_location / f"{safe_filename}.pdf"

            with open(filepath, "wb") as f:
                f.write(file_bytes)

        # Create data source config
        data_source_config = QACatalogGeneratorDataSourceConfig(
            type=request.type,
            data_source_location=temp_source_location,
            data_source_glob=["**/*.pdf"],
        )
        data_source_config_id = await create_temp_data_source_config(
            db, data_source_config
        )
        await db.flush()

        # Create catalog generation data
        generation_data = QACatalogGenerationData(
            type=request.type,
            name=request.name,
            config=request.config,
            data_source_config_id=data_source_config_id,
            model_config_schema=request.model_config_schema,
        )

        # Create catalog and submit generation task
        qa_catalog = await create_qa_catalog(db, [], request.name)
        submit_generate_catalog_task(qa_catalog.id, generation_data)

        return QACatalogGenerationResult(catalog_id=qa_catalog.id)

    except HTTPException:
        # Re-raise HTTP exceptions (like 404 from file store)
        raise
    except Exception as e:
        # Clean up temp directory on error
        import shutil

        if temp_source_location.exists():
            shutil.rmtree(temp_source_location, ignore_errors=True)
        raise HTTPException(
            status_code=500, detail=f"Failed to generate catalog: {str(e)}"
        )


@router.get(
    "/generator/types",
    description="Currently active generator types to select from for catalog creation",
    status_code=200,
)
async def get_generator_types() -> list[ActiveQACatalogGeneratorType]:
    return [
        ActiveQACatalogGeneratorType(type=generator_type)  # type: ignore
        for generator_type in active_generator_types
    ]


@router.post("/download")
async def download(
    db: SessionDep,
    options: DownloadQACatalogOptions,
) -> DownloadQACatalogResponse:
    result = await handle_catalog_download(db, options)
    if not result:
        raise HTTPException(status_code=404, detail="Catalog not found")

    return result


@router.get("/{catalog_id}/history")
async def get_history(db: SessionDep, catalog_id: str) -> QACatalogVersionHistory:
    catalog = await find_qa_catalog(db, catalog_id)
    if not catalog:
        raise HTTPException(status_code=404)

    res = await create_qa_catalog_revision_history(db, catalog)
    return res
