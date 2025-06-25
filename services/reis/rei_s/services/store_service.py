import multiprocessing as mp
from typing import Any, Generator, List
from math import ceil

from fastapi import HTTPException
from langchain_core.documents import Document

from rei_s import logger
from rei_s.services.formats.utils import ProcessingError
from rei_s.services.multiprocess_utils import process_file_in_process
from rei_s.services.embeddings_provider import get_embeddings
from rei_s.config import Config
from rei_s.services.store_adapter import StoreAdapter, StoreFilter
from rei_s.services.store_provider import get_store
from rei_s.types.dtos import SourceDto, ChunkDto, DocumentDto
from rei_s.types.source_file import SourceFile
from rei_s.services.formats.abstract_format_provider import AbstractFormatProvider
from rei_s.services.formats import get_format_provider_mappings, get_format_providers
from rei_s.metrics.metrics import files_processed_counter


def batched(iterable: List[Document], n: int) -> Generator[List[Document], None, None]:
    for i in range(0, len(iterable), n):
        yield iterable[i : i + n]


def get_vector_store(
    config: Config,
    index_name: str | None,
) -> StoreAdapter:
    embeddings = get_embeddings(config)
    vector_store = get_store(config=config, embeddings=embeddings, index_name=index_name)

    if vector_store is None:
        raise RuntimeError("Store service has not been configured")

    return vector_store


def get_file_name_extensions(config: Config) -> list[str]:
    file_name_extensions: list[str] = []
    for format_provider in get_format_providers(config):
        for value in format_provider.file_name_extensions:
            file_name_extensions.append(value)

    return file_name_extensions


def process_file(config: Config, file: SourceFile, chunk_size: int | None = None) -> List[Document]:
    logger.info(f"Processing file: {file.id}")
    chunks_with_metadata = [
        chunk
        for batch, _, _ in generate_batches(config, file, doc_id=file.id, chunk_size=chunk_size)
        for chunk in batch
    ]
    files_processed_counter.inc()
    logger.info(f"Completed file: {file.id}")
    return chunks_with_metadata


def process_and_add_file(config: Config, file: SourceFile, bucket: str, index_name: str | None) -> bool:
    logger.info(f"Processing and add file: {file.id}")
    add_file(config, file, bucket, file.id, index_name)
    files_processed_counter.inc()
    logger.info(f"Completed file: {file.id}")
    return True


def process_file_synchronously(
    format_: AbstractFormatProvider, file: SourceFile, chunk_size: int | None, threshold: int = 10**5
) -> List[Document]:
    # this function tries to optimize for performance,
    # since the process step is the single CPU intensive part
    # * small files are processed in the same thread to avoid overhead of starting a new process,
    #   pickling, copying and unpickling the file
    # * large files will start a new process to avoid the GIL
    #   this will also lead python to release the RAM used for the processing back to the operating system

    if not format_.multiprocessable or file.size < threshold:
        return format_.process_file(file, chunk_size)
    else:
        ctx = mp.get_context("spawn")
        queue = ctx.Queue()
        process = ctx.Process(target=process_file_in_process, args=(format_, file, chunk_size, queue))

        process.start()
        chunks_or_exception = queue.get()
        process.join()

        if isinstance(chunks_or_exception, Exception):
            raise chunks_or_exception
        else:
            chunks: list[Document] = chunks_or_exception

        return chunks


def generate_batches(
    config: Config,
    file: SourceFile,
    bucket: str | None = None,
    doc_id: str | None = None,
    chunk_size: int | None = None,
) -> Generator[tuple[List[Document], int, int], None, None]:
    for format_ in get_format_providers(config):
        if format_.supports(file):
            try:
                chunks = process_file_synchronously(format_, file, chunk_size, config.filesize_threshold)
            except ProcessingError as e:
                logger.warning(f"Failed processing file `{doc_id}`: {e.message}")
                raise HTTPException(status_code=e.status, detail=f"Processing failed: {e.message}") from e
            except Exception as e:
                # catchall, since the format_providers
                # yield individual errors from special exception classes to ValueError
                logger.warning(f"Failed processing file `{doc_id}`: {e!r}")
                raise HTTPException(status_code=400, detail="Processing failed") from e

            if len(chunks) > 0:
                batch_size = config.batch_size if config.batch_size else len(chunks)
                num_batches = ceil(len(chunks) / batch_size)
                for index, chunk_batch in enumerate(batched(chunks, batch_size)):
                    with_metadata = [
                        Document(
                            page_content=x.page_content,
                            metadata={
                                **x.metadata,
                                "format": format_.name,
                                "mime_type": file.mime_type,
                                "doc_id": doc_id,
                                "bucket": bucket,
                                "source": file.file_name,
                            },
                        )
                        for x in chunk_batch
                    ]

                    yield with_metadata, index, num_batches

            return

    raise HTTPException(status_code=415, detail="File format not supported.")


def add_file(config: Config, file: SourceFile, bucket: str, doc_id: str, index_name: str | None = None) -> None:
    vector_store = get_vector_store(config=config, index_name=index_name)
    for batch, index, num_batches in generate_batches(config, file, bucket, doc_id):
        logger.info(f"add {len(batch)} chunks for doc_id {doc_id}: ({index + 1}/{num_batches})")
        vector_store.add_documents(batch)
        logger.info(f"ready with {len(batch)} chunks for doc_id {doc_id}: ({index + 1}/{num_batches})")


def search(
    config: Config,
    query: str,
    bucket: str | None,
    take: int,
    doc_ids: List[str] | None = None,
    index_name: str | None = None,
) -> List[Document]:
    vector_store = get_vector_store(config=config, index_name=index_name)
    store_filter = StoreFilter(bucket=bucket, doc_ids=doc_ids)

    logger.info("start similarity search")

    docs = vector_store.similarity_search(query, take, store_filter)

    # remove bucket before passing it back
    # also call possibly existing cleanup methods for the format
    result: List[Document] = []
    for doc in docs:
        provider = get_format_provider_mappings(config).get(doc.metadata["format"])

        if provider is not None:
            cleaned = provider.clean_up(doc)
        try:
            del cleaned.metadata["bucket"]
        except KeyError:
            pass

        result.append(cleaned)

    return result


def get_documents_content(config: Config, ids: List[str], index_name: str | None = None) -> List[str]:
    vector_store = get_vector_store(config=config, index_name=index_name)
    docs = vector_store.get_documents(ids)

    if docs and docs[0].metadata.get("format") == "pdf":
        docs.sort(key=lambda doc: doc.metadata.get("page", float("inf")))

    content = []

    for doc in docs:
        content.append(doc.page_content)

    return content


def delete_file(config: Config, doc_id: str, index_name: str | None = None) -> None:
    vector_store = get_vector_store(config=config, index_name=index_name)
    logger.info(f"delete chunks with doc_id '{doc_id}'")
    vector_store.delete(doc_id)


def get_file_sources_markdown(results: List[Document]) -> str:
    # TODO: differentiate between pdf and other (if this is really wanted)

    # this might happen for empty buckets
    if len(results) == 0:
        return ""

    header = "## Sources\n\n"

    # it is possible that a file is used twice, but at different locations
    # also dict preserves insertion order, which comes in handy
    locations: dict[str, list[str]] = {i.metadata["source"]: [] for i in results}
    for i in results:
        if "page" in i.metadata:
            locations[i.metadata["source"]].append(str(i.metadata["page"]))
        if "page_number" in i.metadata:
            locations[i.metadata["source"]].append(str(i.metadata["page_number"]))

    content = "* " + "\n* ".join(
        [
            f"{i}" if len(locations[i]) == 0 else f"{i}, p. {', '.join(sorted(set(locations[i])))}"
            for i in locations.keys()
        ]
    )

    return header + content


def parse_int_array(s: Any) -> List[int] | None:
    try:
        return [int(s)]
    except (ValueError, TypeError):
        return None


def get_file_sources(results: List[Document]) -> List[SourceDto]:
    if not results:
        return []

    length = len(results)

    return [
        SourceDto(
            title=doc.metadata.get("source", "Unknown"),
            chunk=ChunkDto(
                uri=doc.metadata.get("id") or doc.id or "",
                content=doc.page_content,
                pages=parse_int_array(doc.metadata.get("page")),
                score=length - i,
            ),
            document=DocumentDto(
                uri=doc.metadata.get("doc_id", ""),
                name=doc.metadata.get("source", "Unknown Filename"),
                mime_type=doc.metadata.get("mime_type", ""),
                link=doc.metadata.get("link"),
            ),
            metadata={key: value for key, value in doc.metadata.items() if key not in {"page", "id", "doc_id"}},
        )
        for i, doc in enumerate(results)
    ]
