import os
from hashlib import md5
from pathlib import Path
from uuid import uuid4

from fastapi import UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from llm_eval.qa_catalog.db.crud_data_source_config import (
    create_temp_data_source_config,
)
from llm_eval.qa_catalog.generator.implementation.QACatalogGeneratorTypes import (  # noqa: E501
    QACatalogGeneratorType,
)
from llm_eval.qa_catalog.generator.interface import (
    QACatalogGeneratorDataSourceConfig,
)
from llm_eval.settings import SETTINGS


def _store_in_tmp(files: list[UploadFile]) -> tuple[Path, list[str]]:
    temp = SETTINGS.file_upload_temp_location

    temp_source_location = temp / str(uuid4())

    # Ensure the temporary directory exists
    os.makedirs(temp_source_location, exist_ok=True)
    data_source_globs: list[str] = []

    # Save files to the temporary directory
    for file in files:
        if not file.filename:
            raise ValueError("filename of an uploaded file cannot be empty")

        # nosemgrep
        safe_filename = md5(bytes(file.filename, encoding="utf-8")).hexdigest()
        file_extension = Path(file.filename).suffix
        filepath = temp_source_location / f"{safe_filename}{file_extension}"
        data_source_globs.append(f"**/*{file_extension}")

        # Open the file in write-binary mode
        with open(filepath, "wb") as buffer:
            # Read the file content and write it to the buffer
            content = file.file.read()
            buffer.write(content)

        # Close the file
        file.file.close()

    return temp_source_location, data_source_globs


async def create_qa_catalog_data_source_config(
    db: AsyncSession, files: list[UploadFile], generator_type: QACatalogGeneratorType
) -> str:
    data_source_location, data_source_glob = _store_in_tmp(files)
    data_source_config = QACatalogGeneratorDataSourceConfig(
        type=generator_type,
        data_source_location=data_source_location,
        data_source_glob=data_source_glob,
    )

    return await create_temp_data_source_config(db, data_source_config)
