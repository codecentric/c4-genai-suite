from io import BytesIO
from typing import Any, Protocol
from faker import Faker
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings
from pydantic import ValidationError
import pytest
from pytest_mock import MockerFixture
from sqlalchemy import create_engine
import sqlalchemy

from rei_s.config import Config, get_config
from rei_s.services.vectorstore_adapter import VectorStoreFilter
from rei_s.services.vectorstores.pgvector import PGVectorStoreAdapter
from tests.conftest import get_test_config

# Here we test the pgvector store.
# We need a running postgres instance reachable via the url in the env variabels.
# We will manipulate the `test` and `pg_test_index` collections.

# Needed environment variables will be read the environment (not from .env files).
# If needed environment variables are missing, the test is skipped

INDEX_NAME = "test"
OTHER_INDEX_NAME = "pg_test_index"


def get_config_override() -> Config:
    try:
        return get_test_config(
            dict(
                store_type="pgvector",
                store_pgvector_index_name=INDEX_NAME,
            )
        )
    except ValidationError as e:
        pytest.skip(f"Skipped! A config value is missing: {e!r}")


@pytest.fixture(scope="function", autouse=True)
def clean_db(app: FastAPI) -> None:
    app.dependency_overrides[get_config] = get_config_override

    index_name = get_config_override().store_pgvector_index_name
    assert index_name == INDEX_NAME
    url = get_config_override().store_pgvector_url
    assert url is not None

    engine = create_engine(url.get_secret_value())
    with engine.connect() as con:
        try:
            con.execute(
                sqlalchemy.text(
                    "DELETE FROM langchain_pg_embedding as a "
                    "WHERE a.collection_id IN ( "
                    f"SELECT b.uuid FROM langchain_pg_collection as b WHERE b.name = '{index_name}' "
                    ")"
                )
            )
            con.execute(
                sqlalchemy.text(
                    "DELETE FROM langchain_pg_embedding as a "
                    "WHERE a.collection_id IN ( "
                    f"SELECT b.uuid FROM langchain_pg_collection as b WHERE b.name = '{OTHER_INDEX_NAME}' "
                    ")"
                )
            )
            con.commit()
        except sqlalchemy.exc.ProgrammingError:
            # if we run it before the table was created, well, we can not delete it
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


def test_upload_file(file_uploader: FileUploaderFixture) -> None:
    file_uploader(bucket=1, file_id=1)


def test_get_files(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    filename, input_content = file_uploader(bucket=1, file_id=1, index_name="")

    # we do not have embeddings, but since we have fewer than 3 entries, we will get a result
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": ""})
    assert response.status_code == 200

    content = response.json()
    assert content["files"][0]["content"] == input_content
    assert content["files"][0]["metadata"]["source"] == filename
    assert content["debug"] == f"## Sources\n\n* {filename}"
    assert "doc_id" in content["files"][0]["metadata"]

    # ensure that internal metadata is cleaned
    assert "bucket" not in content["files"][0]["metadata"]


def test_get_documents_content(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    _filename, _input_content = file_uploader(bucket=1, file_id=1, index_name=OTHER_INDEX_NAME)

    response_get_files = client.get(
        "/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": OTHER_INDEX_NAME}
    )

    assert response_get_files.status_code == 200

    content = response_get_files.json()

    # In this case, we have only one chunk for the file
    file_content = content["files"][0]["content"]

    chunk_id = content["sources"][0]["chunk"]["uri"]

    response_document_content = client.get(
        "/documents/content", params={"chunk_ids": chunk_id, "indexName": OTHER_INDEX_NAME}
    )

    content_document = response_document_content.json()

    assert response_document_content.status_code == 200
    assert content_document == [file_content]


def test_get_files_other_bucket(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    _filename, _input_content = file_uploader(bucket=1, file_id=1)

    response = client.get("/files", params={"query": "test", "bucket": "2", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 0


def test_get_files_deleted(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    _filename, _input_content = file_uploader(bucket=1, file_id=1)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content1 = response.json()
    assert len(content1["files"]) == 1

    response2 = client.delete("/files/1")
    assert response2.status_code == 200

    response3 = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response3.status_code == 200

    content2 = response3.json()
    assert len(content2["files"]) == 0


def test_get_files_filtered_by_file_ids(file_uploader: FileUploaderFixture, client: TestClient) -> None:
    _filename1, _input_content1 = file_uploader(bucket=1, file_id=1)
    filename2, input_content2 = file_uploader(bucket=1, file_id=2)
    filename3, input_content3 = file_uploader(bucket=1, file_id=3)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "files": "3,2"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 2
    assert (
        content["files"][0]["metadata"]["source"] == filename2
        and content["files"][0]["content"] == input_content2
        and content["files"][1]["metadata"]["source"] == filename3
        and content["files"][1]["content"] == input_content3
    ) or (
        content["files"][1]["metadata"]["source"] == filename2
        and content["files"][1]["content"] == input_content2
        and content["files"][0]["metadata"]["source"] == filename3
        and content["files"][0]["content"] == input_content3
    )

    # do not find files in the wrong bucket
    response = client.get("/files", params={"query": "test", "bucket": "2", "take": "3", "files": "3,2"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 0

    # do not find files with an empty file filter string
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "files": ""})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 0


@pytest.mark.parametrize(
    "test_input,expected",
    [
        (None, None),
        (VectorStoreFilter(bucket="1"), {"bucket": {"$eq": "1"}}),
        (VectorStoreFilter(bucket="42", doc_ids=["3", "2"]), {"bucket": {"$eq": "42"}, "doc_id": {"$in": ["3", "2"]}}),
        (VectorStoreFilter(doc_ids=["3", "2"]), {"doc_id": {"$in": ["3", "2"]}}),
        (VectorStoreFilter(bucket="2", doc_ids=[]), {"bucket": {"$eq": "2"}, "doc_id": {"$in": []}}),
    ],
)
def test_filter_conversion(test_input: VectorStoreFilter, expected: dict[str, Any]) -> None:
    assert PGVectorStoreAdapter.convert_filter(test_input) == expected
