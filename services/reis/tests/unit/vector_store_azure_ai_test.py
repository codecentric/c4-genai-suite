from io import BytesIO
from faker import Faker
from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings
import pytest

from pytest_mock import MockerFixture
from responses import RequestsMock
from rei_s.config import Config, get_config
from rei_s.services.vectorstore_adapter import VectorStoreFilter
from rei_s.services.vectorstores.azure_ai_search import AzureAISearchStoreAdapter
from tests.conftest import get_test_config
from ..data.response_get_index import index_get

# Here we test the Azure AI search without calling out to Azure

index_name = "test"
endpoint = "https://example.search.windows.net"
api_version = "2025-09-01"


def get_config_override() -> Config:
    return get_test_config(
        dict(
            store_type="azure-ai-search",
            store_azure_ai_search_service_endpoint=endpoint,
            store_azure_ai_search_service_api_key="secret",
            store_azure_ai_search_service_api_version=api_version,
            store_azure_ai_search_service_index_name=index_name,
        )
    )


@pytest.fixture
def client(mocker: MockerFixture, app: FastAPI) -> TestClient:
    app.dependency_overrides[get_config] = get_config_override

    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.store_service.get_embeddings", return_value=FakeEmbeddings(size=1352))

    client = TestClient(app)

    return client


def test_upload_file(faker: Faker, client: TestClient, responses: RequestsMock) -> None:
    filename = faker.file_name(extension="txt")
    content = faker.text()

    responses.add(index_get(endpoint, index_name, api_version))
    responses.add(
        responses.POST,
        f"{endpoint}/indexes('{index_name}')/docs/search.index?api-version={api_version}",
        json={"value": [{"key": "1", "status": True, "errorMessage": None, "statusCode": 201}]},
    )

    f = BytesIO(content.encode())
    response = client.post(
        "/files",
        data=f,  # type: ignore[arg-type]
        headers={
            "bucket": "1",
            "id": "1",
            "fileName": filename,
            "fileMimeType": "text/plain",
        },
    )

    assert response.status_code == 200


def mock_search_response(responses: RequestsMock, filename: str, input_content: str) -> None:
    responses.add(index_get(endpoint, index_name, api_version))
    responses.add(
        responses.POST,
        f"{endpoint}/indexes('{index_name}')/docs/search.post.search?api-version={api_version}",
        json={
            "value": [
                {
                    "@search.score": 0.03333333507180214,
                    "id": "1",
                    "content": input_content,
                    "metadata": '{"format": "markdown", "id": "1", "bucket": "15", "source": "%s", "doc_id": "3"}'
                    % filename,
                }
            ]
        },
    )


def test_get_files(client: TestClient, responses: RequestsMock, faker: Faker) -> None:
    filename = faker.file_name(extension="md")
    input_content = faker.text()
    mock_search_response(responses, filename, input_content)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})

    content = response.json()
    assert content["files"][0]["content"] == input_content
    assert content["files"][0]["metadata"]["source"] == filename
    assert content["debug"] == f"## Sources\n\n* {filename}"
    assert "doc_id" in content["files"][0]["metadata"]

    # ensure that internal metadata is cleaned
    assert "bucket" not in content["files"][0]["metadata"]


def test_get_documents_content(client: TestClient, responses: RequestsMock, faker: Faker) -> None:
    filename = faker.file_name(extension="md")
    input_content = faker.text()

    mock_search_response(responses, filename, input_content)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})

    assert response.status_code == 200

    content = response.json()

    # In this case, we have only one chunk for the file
    file_content = content["files"][0]["content"]

    chunk_id = content["sources"][0]["chunk"]["uri"]

    response_content = client.get("/documents/content", params={"chunk_ids": chunk_id})

    assert response_content.status_code == 200
    assert response_content.json() == [file_content]


def test_get_files_deleted(client: TestClient, responses: RequestsMock) -> None:
    responses.add(index_get(endpoint, index_name, api_version))
    responses.add(
        responses.POST,
        f"{endpoint}/indexes('{index_name}')/docs/search.post.search?api-version={api_version}",
        json={"value": [{"@search.score": 1.0, "id": "chunk_id"}]},
    )
    responses.add(
        responses.POST,
        f"{endpoint}/indexes('{index_name}')/docs/search.index?api-version={api_version}",
        json={
            "value": [
                {
                    "key": "chunk_id",
                    "status": True,
                    "errorMessage": None,
                    "statusCode": 200,
                }
            ]
        },
    )

    response = client.delete("/files/1")

    assert response.status_code == 200


@pytest.mark.parametrize(
    "test_input,expected",
    [
        (None, None),
        (VectorStoreFilter(bucket="1"), "bucket eq '1'"),
        (VectorStoreFilter(bucket="42", doc_ids=["3", "2"]), "bucket eq '42' and search.in(doc_id, '3, 2')"),
        (VectorStoreFilter(doc_ids=["3", "2"]), "search.in(doc_id, '3, 2')"),
    ],
)
def test_filter_conversion(test_input: VectorStoreFilter, expected: str) -> None:
    assert AzureAISearchStoreAdapter.convert_filter(test_input) == expected


def test_filter_conversion_raises() -> None:
    with pytest.raises(Exception) as exc_info:
        AzureAISearchStoreAdapter.convert_filter(VectorStoreFilter(bucket="42", doc_ids=[]))
    assert exc_info.value.args[0] == "The result would not match any entry"
