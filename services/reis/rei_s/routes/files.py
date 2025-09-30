import re
from typing import Annotated, List, Optional
from asyncio import wrap_future
import uuid
import aiofiles
from urllib.parse import unquote

from fastapi import APIRouter, Depends, Request, Header, Response, HTTPException
from fastapi.params import Query

from fastapi.responses import FileResponse
from pydantic import AfterValidator
from rei_s.services import store_service
from rei_s.config import Config, get_config
from rei_s.types.dtos import (
    FileProcessResult,
    ResultDocument,
    FileResult,
    FileType,
    FileTypesResult,
)
from rei_s.types.source_file import SourceFile
from rei_s import logger
from rei_s.utils import get_uploaded_file_path
from rei_s.metrics.metrics import files_added_to_queue


router = APIRouter()


def check_index_name(index_name: str) -> str | None:
    # We enforce the most strict subset of rules to satisfy all vector stores
    # (at the moment that are just the Azure AI Search rules)
    if index_name == "":
        return None
    if len(index_name) < 2 or len(index_name) > 128:
        raise ValueError("Invalid index name. The index name must be between 2 and 128 characters long")
    pattern = r"^[a-z0-9_-]+$"
    if not re.match(pattern, index_name):
        raise ValueError(
            "Invalid index name. The index name may only contain lower case ascii letters, numbers, `-` and `_`"
        )
    return index_name


@router.get("/files/types", tags=["files"], operation_id="getFileTypes")
async def get_file_types(config: Annotated[Config, Depends(get_config)]) -> FileTypesResult:
    """
    Get the file types which can be processed.
    """
    file_name_extensions = store_service.get_file_name_extensions(config)
    return FileTypesResult(
        items=[FileType(file_name_extension=file_name_extension) for file_name_extension in file_name_extensions]
    )


@router.get(
    "/files",
    tags=["files"],
    operation_id="getFiles",
    responses={
        422: {
            "description": "Validation error",
        },
    },
)
def get_files(
    config: Annotated[Config, Depends(get_config)],
    query: Annotated[str, Query(description="The query from the internal tool")],
    take: Annotated[int, Query(description="The number of results to return")],
    bucket: Annotated[Optional[str], Query(description="The ID of the bucket")] = None,
    index_name: Annotated[
        Optional[str], Query(description="The name of the index", alias="indexName"), AfterValidator(check_index_name)
    ] = None,
    files: Annotated[
        Optional[str],
        Query(description="Comma separated list of file IDs to restrict the query. Can be ignored if empty"),
    ] = None,
) -> FileResult:
    """
    Get the files matching the query.
    """
    file_ids = files.split(",") if files is not None else None
    store_docs = store_service.search(config, query, bucket, take, file_ids, index_name)

    docs = [ResultDocument(content=doc.page_content, metadata=getattr(doc, "metadata", {})) for doc in store_docs]

    debug = store_service.get_file_sources_markdown(store_docs)

    sources = store_service.get_file_sources(config, store_docs)
    return FileResult(files=docs, debug=debug, sources=sources)


@router.get(
    "/documents/content",
    tags=["files"],
    operation_id="getDocumentsContent",
)
def get_documents_content(
    config: Annotated[Config, Depends(get_config)],
    chunk_ids: Annotated[List[str], Query(description="The IDs of the chunks to retrieve")],
    index_name: Annotated[
        Optional[str], Query(description="The name of the index", alias="indexName"), AfterValidator(check_index_name)
    ] = None,
) -> List[str]:
    """
    Get the documents content by their IDs.
    """
    content = store_service.get_documents_content(config, chunk_ids, index_name)

    return content


@router.get(
    "/documents/pdf",
    tags=["files"],
    operation_id="getDocumentPdf",
    response_class=FileResponse,
    responses={
        200: {"content": {"application/octet-stream": {"schema": {"type": "string", "format": "binary"}}}},
        404: {
            "description": "File Not Found",
        },
    },
)
def get_document_pdf(
    config: Annotated[Config, Depends(get_config)],
    doc_id: Annotated[str, Query(description="The ID of the document")],
) -> Response:
    """
    Get the document's pdf by its ID.
    """
    content = store_service.get_document_pdf(config, doc_id)

    if content is None:
        raise HTTPException(status_code=404, detail="PDF not found")

    return FileResponse(content.path, media_type="application/octet-stream")


@router.post(
    "/files",
    tags=["files"],
    operation_id="uploadFile",
    responses={
        400: {
            "description": "Processing failed",
        },
        413: {
            "description": "File too large",
        },
        415: {
            "description": "File format not supported",
        },
        422: {
            "description": "Validation error",
        },
    },
)
async def post_files(
    config: Annotated[Config, Depends(get_config)],
    request: Request,
    file_name: Annotated[str, Header(alias="fileName")],
    file_mime_type: Annotated[str, Header(alias="fileMimeType")],
    bucket: Annotated[str, Header()],
    file_id: Annotated[str, Header(description="The ID of the file", alias="id")],
    index_name: Annotated[
        str | None, Header(description="The name of the index", alias="indexName"), AfterValidator(check_index_name)
    ] = None,
) -> None:
    """
    Processes the file into chunks and stores them in the vector store.
    """
    if file_name is None:
        raise ValueError("File name is not defined")
    if file_mime_type is None:
        raise ValueError("content_type is not defined")

    dest_path = get_uploaded_file_path(file_id)
    async with aiofiles.open(dest_path, "wb") as temp_file:
        async for chunk in request.stream():
            await temp_file.write(chunk)

    q = SourceFile(id=file_id, path=dest_path, file_name=unquote(file_name), mime_type=file_mime_type)
    try:
        files_added_to_queue.inc()
        await wrap_future(
            request.app.state.executor.submit(
                store_service.process_and_add_file, config, q, bucket, index_name=index_name
            )
        )
    except Exception as e:
        logger.error(f"Error response from task: {e}")
        raise
    finally:
        q.delete()


@router.post(
    "/files/process",
    tags=["files"],
    operation_id="processFile",
    responses={
        400: {
            "description": "Processing failed",
        },
        413: {
            "description": "File too large",
        },
        415: {
            "description": "File format not supported",
        },
    },
)
async def post_files_only_processing(
    config: Annotated[Config, Depends(get_config)],
    request: Request,
    file_name: Annotated[str, Header(alias="fileName")],
    file_mime_type: Annotated[str, Header(alias="fileMimeType")],
    chunk_size: Annotated[int | None, Header(alias="chunkSize")] = None,
) -> FileProcessResult:
    """
    Processes the file into chunks and directly returns the chunks.

    In contrast to the POST /files endpoint, this one does not store the chunks in the vectorstore
    """
    if file_name is None:
        raise ValueError("File name is not defined")
    if file_mime_type is None:
        raise ValueError("content_type is not defined")

    file_id = str(uuid.uuid4())

    dest_path = get_uploaded_file_path(file_id)
    async with aiofiles.open(dest_path, "wb") as temp_file:
        async for chunk in request.stream():
            await temp_file.write(chunk)

    q = SourceFile(id=file_id, path=dest_path, file_name=unquote(file_name), mime_type=file_mime_type)
    try:
        result = await wrap_future(request.app.state.executor.submit(store_service.process_file, config, q, chunk_size))
    except Exception as e:
        logger.error(f"Error response from task: {e}")
        raise
    finally:
        q.delete()
    processed_docs = result

    docs = [ResultDocument(content=doc.page_content, metadata=getattr(doc, "metadata", {})) for doc in processed_docs]

    return FileProcessResult(chunks=docs)


@router.delete("/files/{file_id}", tags=["files"], operation_id="deleteFile")
def delete_files(
    config: Annotated[Config, Depends(get_config)],
    file_id: str,
    index_name: Annotated[
        str | None, Query(description="The name of the index", alias="indexName"), AfterValidator(check_index_name)
    ] = None,
) -> None:
    """
    Deletes all chunks belonging to the specified file in the vector store.
    """
    store_service.delete_file(config, file_id, index_name)
