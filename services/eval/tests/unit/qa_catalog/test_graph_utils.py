from unittest.mock import MagicMock, patch

from llm_eval.qa_catalog.graph_utils import create_backup


@patch("llm_eval.qa_catalog.graph_utils.os.path.exists", return_value=False)
@patch("builtins.print")
def test_create_backup_file_not_found_print(
    mock_print: MagicMock, _: MagicMock
) -> None:
    create_backup("non_existent_file.txt")
    mock_print.assert_called_once_with(
        "Error: The file 'non_existent_file.txt' does not exist."
    )


@patch("llm_eval.qa_catalog.graph_utils.shutil.copy2")
@patch("llm_eval.qa_catalog.graph_utils.os.path.exists", return_value=True)
@patch("llm_eval.qa_catalog.graph_utils.datetime")
def test_create_backup_success(
    mock_datetime: MagicMock, _: MagicMock, mock_copy: MagicMock
) -> None:
    mock_datetime.now.return_value.strftime.return_value = "20230101_120000"
    create_backup("test_file.txt")
    mock_copy.assert_called_once_with(
        "test_file.txt", "backup_20230101_120000_test_file.txt"
    )


@patch(
    "llm_eval.qa_catalog.graph_utils.shutil.copy2",
    side_effect=PermissionError,
)
@patch("llm_eval.qa_catalog.graph_utils.os.path.exists", return_value=True)
@patch("builtins.print")
def test_create_backup_permission_error_print(
    mock_print: MagicMock, mock_exists: MagicMock, mock_copy: MagicMock
) -> None:
    create_backup("test_file.txt")
    mock_print.assert_called_once_with(
        "Error: Permission denied. Unable to create backup of 'test_file.txt'."
    )


@patch(
    "llm_eval.qa_catalog.graph_utils.shutil.copy2",
    side_effect=Exception("Unexpected error"),
)
@patch("llm_eval.qa_catalog.graph_utils.os.path.exists", return_value=True)
@patch("builtins.print")
def test_create_backup_unexpected_error_print(
    mock_print: MagicMock, mock_exists: MagicMock, mock_copy: MagicMock
) -> None:
    create_backup("test_file.txt")
    mock_print.assert_called_once_with("An unexpected error occurred: Unexpected error")
