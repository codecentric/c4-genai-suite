from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from fastapi import UploadFile

from llm_eval.qa_catalog.logic.upload import _store_in_tmp


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.upload.uuid4")
@patch("llm_eval.qa_catalog.logic.upload.SETTINGS")
def test_store_in_tmp_success(mock_settings: MagicMock, mock_uuid4: MagicMock) -> None:
    mock_uuid4.return_value = "test-uuid"
    mock_settings.file_upload_temp_location = Path("/tmp")

    mock_file1 = MagicMock(spec=UploadFile)
    mock_file1.filename = "test_doc.txt"
    mock_file1.file = MagicMock()
    mock_file1.file.read.return_value = b"test content"

    mock_file2 = MagicMock(spec=UploadFile)
    mock_file2.filename = "test_image.png"
    mock_file2.file = MagicMock()
    mock_file2.file.read.return_value = b"test image content"

    files = [mock_file1, mock_file2]

    m = MagicMock()
    with patch("builtins.open", m):
        with patch("os.makedirs") as mock_makedirs:
            result_path, result_globs = _store_in_tmp(files)  # type: ignore

            expected_temp_dir = Path("/tmp/test-uuid")
            assert result_path == expected_temp_dir
            assert set(result_globs) == {"**/*.txt", "**/*.png"}

            mock_makedirs.assert_called_once_with(expected_temp_dir, exist_ok=True)

            assert m.call_count == 2

            mock_file1.file.close.assert_called_once()
            mock_file2.file.close.assert_called_once()


@pytest.mark.asyncio
@patch("llm_eval.qa_catalog.logic.upload.SETTINGS")
@patch("llm_eval.qa_catalog.logic.upload.os.makedirs")
def test_store_in_tmp_empty_filename(_: MagicMock, mock_settings: MagicMock) -> None:
    mock_settings.file_upload_temp_location = Path("/tmp")

    mock_file = MagicMock(spec=UploadFile)
    mock_file.filename = ""

    with pytest.raises(
        ValueError, match="filename of an uploaded file cannot be empty"
    ):
        _store_in_tmp([mock_file])
