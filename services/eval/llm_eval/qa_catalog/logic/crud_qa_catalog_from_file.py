import io
import json
from pathlib import Path
from typing import Any, Hashable, List
from uuid import uuid4

import pandas as pd
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.database.model import (
    QACatalog,
    QACatalogGroup,
    QACatalogStatus,
    QAPair,
)
from llm_eval.qa_catalog.db.insert_qa_catalog import insert_qa_catalog
from llm_eval.qa_catalog.db.stream_qa_pairs import stream_qa_pairs
from llm_eval.qa_catalog.db.update_qa_catalog import update_qa_catalog
from llm_eval.qa_catalog.models import (
    NewQAPair as ApiModelNewQAPair,
)
from llm_eval.qa_catalog.models import (
    QACatalogUpdateRequest,
)
from llm_eval.qa_catalog.models import (
    QAPair as ApiModelQAPair,
)

REQUIRED_KEYS = ["question", "contexts", "expected_output"]


async def create_qa_catalog_from_file(
    db: AsyncSession, file: UploadFile, name: str
) -> QACatalog:
    _validate_file(file)

    pairs = await _parse_file(file)

    qa_catalog_group = QACatalogGroup(id=str(uuid4()), name=name)
    qa_catalog = create_qa_catalog_entity(
        _build_qa_pairs_from_dict(pairs), qa_catalog_group
    )

    return await insert_qa_catalog(db, qa_catalog)


async def update_qa_catalog_from_file(
    db: AsyncSession, file: UploadFile, prev_qa_catalog: QACatalog
) -> QACatalog:
    _validate_file(file)

    pairs = await _parse_file(file)

    qa_catalog = create_new_version_of_qa_catalog_entity(
        prev_qa_catalog, _build_qa_pairs_from_dict(pairs)
    )

    return await update_qa_catalog(db, qa_catalog)


async def update_qa_catalog_from_request(
    db: AsyncSession, request: QACatalogUpdateRequest, prev_qa_catalog: QACatalog
) -> QACatalog:
    pairs = await _update_qa_pairs_from_request(db, request, prev_qa_catalog.id)

    new_catalog = create_new_version_of_qa_catalog_entity(prev_qa_catalog, pairs)

    return await update_qa_catalog(db, new_catalog)


def _validate_file(file: UploadFile) -> None:
    if file.filename is None:
        raise ValueError("No filename given")


async def _parse_file(file: UploadFile) -> list[dict[str, Any]]:
    if file.filename is None:
        raise ValueError("No filename given")

    ext = Path(file.filename).suffix

    # TODO Doing this async freezes pytest after the test is run.
    # I have not found a solution yet
    try:
        content = file.file.read()
    finally:
        _ = file.close()

    match ext:
        case ".csv":
            csv_file = io.StringIO(content.decode("utf-8"))
            return _preprocess_upload_files(
                pd.read_csv(csv_file).to_dict(orient="records")
            )
        case ".json":
            return json.loads(content)
        case ".xlsx":
            excel_file = io.BytesIO(content)
            return _preprocess_upload_files(
                pd.read_excel(excel_file).to_dict(orient="records")
            )
        case _:
            raise ValueError(f"File extension {ext} is not supported.")


def _preprocess_upload_files(
    content: List[dict[Hashable, Any]],
) -> list[dict[str, Any]]:
    if len(content) == 0:
        raise ValueError("Empty file")

    for entry in content:
        if not set(REQUIRED_KEYS).issubset(entry.keys()):
            error_message = (
                "The file is missing the following required keys: "
                f"{set(REQUIRED_KEYS).difference(set(entry.keys()))}. "
                "It should include "
                f"{REQUIRED_KEYS}."
            )
            raise ValueError(error_message)

        entry["meta_data"] = {
            key: value for key, value in entry.items() if key not in REQUIRED_KEYS
        }

        try:
            entry["contexts"] = json.loads(entry["contexts"])
        except json.JSONDecodeError:
            entry["contexts"] = []

    return content


def create_qa_catalog_entity(
    pairs: list[QAPair], qa_catalog_group: QACatalogGroup
) -> QACatalog:
    return QACatalog(
        id=str(uuid4()),
        status=QACatalogStatus.READY,
        revision=1,
        qa_catalog_group_id=qa_catalog_group.id,
        qa_catalog_group=qa_catalog_group,
        qa_pairs=pairs,
    )


def _build_qa_pairs_from_dict(pairs: list[dict]) -> List[QAPair]:
    return [
        QAPair(
            id=str(uuid4()),
            question=pair["question"],
            expected_output=pair["expected_output"],
            contexts=pair["contexts"],
            meta_data=pair["meta_data"],
        )
        for pair in pairs
    ]


def create_new_version_of_qa_catalog_entity(
    prev_qa_catalog: QACatalog, pairs: list[QAPair]
) -> QACatalog:
    new_catalog = create_qa_catalog_entity(
        pairs=pairs, qa_catalog_group=prev_qa_catalog.qa_catalog_group
    )
    new_catalog.created_at = prev_qa_catalog.created_at
    new_catalog.revision = prev_qa_catalog.revision + 1
    new_catalog.qa_catalog_group_id = prev_qa_catalog.qa_catalog_group_id

    return new_catalog


async def _update_qa_pairs_from_request(
    db: AsyncSession, request: QACatalogUpdateRequest, qa_catalog_id: str
) -> List[QAPair]:
    updated_pairs = {p.id: p for p in request.updates}

    result = []
    async for pair in stream_qa_pairs(db, qa_catalog_id):
        if pair.id in request.deletions:
            continue
        if pair.id in updated_pairs.keys():
            updated_pair = updated_pairs[pair.id]
            result.append(_create_qa_pair(updated_pair, qa_catalog_id))
        else:
            # even for untouched pairs need to create a new id
            result.append(_create_qa_pair(pair, qa_catalog_id))

    return result + [_create_qa_pair(pair, qa_catalog_id) for pair in request.additions]


def _create_qa_pair(
    pair: ApiModelQAPair | ApiModelNewQAPair, qa_catalog_id: str
) -> QAPair:
    meta_data = pair.meta_data if isinstance(pair, ApiModelQAPair) else {}

    return QAPair(
        id=str(uuid4()),
        question=pair.question,
        expected_output=pair.expected_output,
        contexts=pair.contexts,
        meta_data=meta_data,
        qa_catalog_id=qa_catalog_id,
    )
