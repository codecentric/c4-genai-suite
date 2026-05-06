import io
from io import BytesIO
from typing import Any, AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pandas as pd
import pytest
from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.config.paths import TEST_DIR
from llm_eval.database.model import QACatalog, QAPair
from llm_eval.qa_catalog.logic.crud_qa_catalog_from_file import (
    REQUIRED_KEYS,
    _parse_file,
    _preprocess_upload_files,
    _update_qa_pairs_from_request,
    _validate_file,
    create_qa_catalog_from_file,
)
from llm_eval.qa_catalog.models import (
    NewQAPair as ApiModelNewQAPair,
)
from llm_eval.qa_catalog.models import (
    QACatalogUpdateRequest,
)
from llm_eval.qa_catalog.models import (
    QAPair as ApiModelQAPair,
)

filenames = ["json_tests.json", "excel_tests.xlsx", "csv_tests.csv"]


@pytest.mark.asyncio
@pytest.mark.parametrize("filename", filenames)
async def test_create_qa_catalog_from_file(filename: str) -> None:
    # Mock the database session
    db = AsyncMock(spec=AsyncSession)
    file_path = TEST_DIR / f"test_data/{filename}"
    with open(file_path, "rb") as file:
        file_content = file.read()
        file_size = len(file_content)
        upload_file = UploadFile(filename=filename, file=BytesIO(file_content))
        upload_file.size = file_size

        with patch(
            "llm_eval.qa_catalog.db.insert_qa_catalog.insert_qa_catalog",
            return_value=None,
        ):
            qa_catalog = await create_qa_catalog_from_file(
                db=db, file=upload_file, name="testcatalog"
            )
            assert isinstance(qa_catalog, QACatalog)
            for qa_pair in qa_catalog.qa_pairs:
                assert hasattr(qa_pair, "question"), (
                    "QAPair does not have 'question' attribute"
                )
                assert hasattr(qa_pair, "expected_output"), (
                    "QAPair does not have 'expected output' attribute"
                )
                assert hasattr(qa_pair, "contexts"), (
                    "QAPair does not have 'contexts' attribute"
                )


filenames = ["csv_tests_missing_fields.csv", "csv_tests_missing_fields_question.csv"]


@pytest.mark.asyncio
@pytest.mark.parametrize("filename", filenames)
async def test_preprocess_upload(filename: str) -> None:
    file_path = TEST_DIR / f"test_data/{filename}"
    with open(file_path, "rb") as file:
        file_content = file.read()
        upload_file = io.StringIO(file_content.decode("utf-8"))
        content = pd.read_csv(upload_file).to_dict(orient="records")

        for entry in content:
            missing_keys = set(REQUIRED_KEYS).difference(entry.keys())
            if missing_keys:
                with pytest.raises(ValueError) as excinfo:
                    _preprocess_upload_files(content)
                # Compare error message ignoring set order
                actual_msg = str(excinfo.value)
                assert "The file is missing the following required keys:" in actual_msg
                for key in missing_keys:
                    assert key in actual_msg
                assert "It should include" in actual_msg
                for key in REQUIRED_KEYS:
                    assert key in actual_msg
                break


def test_empty_file() -> None:
    with pytest.raises(ValueError, match="Empty file"):
        _preprocess_upload_files({})  # type: ignore


@pytest.mark.asyncio
async def test_unsupported_extension() -> None:
    file = UploadFile(filename="unsupported_file.xyz", file=BytesIO(b"content"))
    with pytest.raises(ValueError, match=r"File extension \.xyz is not supported\."):
        await _parse_file(file)


@pytest.mark.asyncio
async def test_no_filename() -> None:
    file_path = TEST_DIR / "test_data/csv_tests.csv"
    with open(file_path, "rb") as file:
        file_content = file.read()
        file_size = len(file_content)
        upload_file = UploadFile(filename=None, file=BytesIO(file_content))
        upload_file.size = file_size

        with pytest.raises(ValueError, match="No filename given"):
            _validate_file(upload_file)


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.crud_qa_catalog_from_file.stream_qa_pairs")
async def test_update_qa_pairs(mock_stream_qa_pairs: MagicMock) -> None:
    keep = _build_qa_pair("keep", "catalog_id")
    update1 = _build_qa_pair("update1", "catalog_id")
    update2 = _build_qa_pair("update2", "catalog_id")
    delete1 = _build_qa_pair("delete1", "catalog_id")
    delete2 = _build_qa_pair("delete2", "catalog_id")

    r_update1 = _build_updated_qa_pair("update1", update1.id)
    r_update2 = _build_updated_qa_pair("update2", update2.id)
    r_new1 = _build_new_qa_pair("new1")

    request = QACatalogUpdateRequest(
        updates=[r_update1, r_update2],
        additions=[r_new1],
        deletions=[delete1.id, delete2.id],
    )

    async def async_pairs(_: Any, __: Any) -> AsyncGenerator:  # noqa: ANN401
        pairs = [keep, update1, update2, delete1, delete2]
        for i in pairs:
            yield i

    mock_stream_qa_pairs.side_effect = async_pairs

    result = await _update_qa_pairs_from_request(MagicMock(), request, "catalog_id")

    assert len(result) == 4

    assert keep not in result
    assert delete1 not in result
    assert delete2 not in result
    assert update1 not in result
    assert update2 not in result
    result_updated1 = result[1]
    assert result_updated1.id is not None
    assert result_updated1.qa_catalog_id == "catalog_id"
    assert result_updated1.question == r_update1.question
    assert result_updated1.expected_output == r_update1.expected_output
    assert result_updated1.contexts == r_update1.contexts
    assert result_updated1.meta_data == r_update1.meta_data

    result_updated2 = result[2]
    assert result_updated2.id is not None
    assert result_updated2.qa_catalog_id == "catalog_id"
    assert result_updated2.question == r_update2.question
    assert result_updated2.expected_output == r_update2.expected_output
    assert result_updated2.contexts == r_update2.contexts
    assert result_updated2.meta_data == r_update2.meta_data


def _build_qa_pair(name: str, qa_catalog_id: str) -> QAPair:
    return QAPair(
        id=f"{name}_id",
        qa_catalog_id=qa_catalog_id,
        expected_output=f"{name}_e",
        question=f"{name}_q",
        meta_data=f"{name}_m",
        contexts=[f"{name}_c1", f"{name}_c2"],
    )


def _build_updated_qa_pair(name: str, from_id: str) -> ApiModelQAPair:
    postfix = "updated"

    return ApiModelQAPair(
        id=from_id,
        expected_output=f"{name}_e_{postfix}",
        question=f"{name}_q_{postfix}",
        meta_data={f"{name}_m_{postfix}_key": f"{name}_m_{postfix}_value"},
        contexts=[f"{name}_c1_{postfix}", f"{name}_c2_{postfix}"],
    )


def _build_new_qa_pair(name: str) -> ApiModelNewQAPair:
    postfix = "new"

    return ApiModelNewQAPair(
        expected_output=f"{name}_e_{postfix}",
        question=f"{name}_q_{postfix}",
        contexts=[f"{name}_c1_{postfix}", f"{name}_c2_{postfix}"],
    )


def test_preprocess_upload_files() -> None:
    test_data = [
        {
            "question": "What is AI?",
            "expected_output": "Artificial Intelligence",
            "contexts": '[{"context1":"context1"},{"context2":"context2"}]',
            "extra1": "extra1",
            "extra2": "extra2",
        },
        {
            "question": "What is ML?",
            "expected_output": "Machine Learning",
            "contexts": '[{"context3":"context3"},{"context4":"context4"}]',
            "extra3": "extra3",
            "extra4": "extra4",
        },
    ]

    test_set = [
        {
            "question": "What is AI?",
            "expected_output": "Artificial Intelligence",
            "contexts": [{"context1": "context1"}, {"context2": "context2"}],
            "meta_data": {"extra1": "extra1", "extra2": "extra2"},
            "extra1": "extra1",
            "extra2": "extra2",
        },
        {
            "question": "What is ML?",
            "expected_output": "Machine Learning",
            "contexts": [{"context3": "context3"}, {"context4": "context4"}],
            "meta_data": {"extra3": "extra3", "extra4": "extra4"},
            "extra3": "extra3",
            "extra4": "extra4",
        },
    ]

    assert test_set == _preprocess_upload_files(test_data)  # type: ignore
