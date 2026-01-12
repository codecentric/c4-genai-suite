from io import BytesIO
from typing import Protocol
from faker import Faker
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings
from pydantic import ValidationError
import pytest
from pytest_mock import MockerFixture
from rei_s.services.filestores.s3 import S3FileStoreAdapter
from mypy_boto3_s3.type_defs import ObjectIdentifierTypeDef

from rei_s.config import Config, get_config
from rei_s.services.formats.pdf_provider import PdfProvider
from rei_s.types.source_file import SourceFile
from tests.conftest import get_test_config

# Here we test the s3 store.
# We need a s3 instance reachable via the data in the env variabels.

# Needed environment variables will be read the environment (not from .env files).
# If needed environment variables are missing, the test is skipped


INDEX_NAME = "s3_test"


def get_config_override() -> Config:
    try:
        return get_test_config(
            dict(
                file_store_type="s3",
                store_type="pgvector",
                store_pgvector_index_name=INDEX_NAME,
            )
        )
    except ValidationError as e:
        pytest.skip(f"Skipped! A config value is missing: {e!r}")
        raise  # For type checker - pytest.skip raises but type checker doesn't know


@pytest.fixture(scope="function", autouse=True)
def clean_bucket(app: FastAPI) -> None:
    app.dependency_overrides[get_config] = get_config_override

    try:
        s3 = S3FileStoreAdapter.create(get_config_override())

        objects = s3.client.list_objects_v2(Bucket=s3.bucket_name)
        if "Contents" in objects:
            objects_to_delete: list[ObjectIdentifierTypeDef] = [{"Key": obj["Key"]} for obj in objects["Contents"]]  # type: ignore[misc]
            s3.client.delete_objects(Bucket=s3.bucket_name, Delete={"Objects": objects_to_delete})

        # Delete the bucket
        s3.client.delete_bucket(Bucket=s3.bucket_name)
    except Exception:
        pass


@pytest.fixture
def client(mocker: MockerFixture, app: FastAPI) -> TestClient:
    app.dependency_overrides[get_config] = get_config_override

    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.store_service.get_embeddings", return_value=FakeEmbeddings(size=1352))

    client = TestClient(app)

    return client


class FileUploaderFixture(Protocol):
    def __call__(self, bucket: int = ..., file_id: int = ..., index_name: str = ...) -> tuple[str, str]: ...


@pytest.fixture
def file_uploader(faker: Faker, client: TestClient) -> FileUploaderFixture:
    def inner(bucket: int = 1, file_id: int = 1, index_name: str = INDEX_NAME) -> tuple[str, str]:
        filename = faker.file_name(extension="txt")
        content = faker.text()

        f = BytesIO(content.encode())
        response = client.post(
            "/files",
            data=f,  # type: ignore[arg-type]
            headers={
                "bucket": str(bucket),
                "id": str(file_id),
                "fileName": filename,
                "fileMimeType": "text/plain",
                "indexName": index_name,
            },
        )

        assert response.status_code == 200

        return filename, content

    return inner


def test_get_document_pdf(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    _filename, input_content = file_uploader(bucket=1, file_id=1, index_name=INDEX_NAME)

    response_get_files = client.get(
        "/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": INDEX_NAME}
    )

    assert response_get_files.status_code == 200

    content = response_get_files.json()

    doc_id = content["sources"][0]["document"]["uri"]

    response_document_pdf = client.get("/documents/pdf", params={"doc_id": doc_id})

    pdf_bytes = response_document_pdf.read()

    assert response_document_pdf.status_code == 200
    assert len(pdf_bytes) > 0

    pdf_file = SourceFile.new_temporary_file(pdf_bytes, "pdf")
    pdf_content = PdfProvider().process_file(pdf_file, chunk_overlap=0)
    text = "".join(i.page_content for i in pdf_content)
    assert input_content[:20] in text
