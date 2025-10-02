from io import BytesIO
import random
import string
from time import sleep
from typing import Generator

from faker import Faker
from fastapi import FastAPI
from fastapi.testclient import TestClient
from pydantic import ValidationError
import pytest

from pytest_mock import MockerFixture
from rei_s.config import Config, get_config
from tests.conftest import get_test_config

# Here we test the Azure AI search end to end by calling to a test deployment.

# Needed environment variables will be read the environment (not from .env files).
# If needed environment variables are missing, the test is skipped

random_ext = "-" + "".join(random.choices(string.ascii_lowercase + string.digits, k=8))


def get_config_override() -> Config:
    try:
        base_name = get_test_config().store_azure_ai_search_service_index_name
        return get_test_config(
            dict(
                _env_file=".env.test",
                store_type="azure-ai-search",
                store_azure_ai_search_service_index_name=base_name + random_ext,
            )
        )
    except ValidationError as e:
        pytest.skip(f"Skipped! A config value is missing: {e!r}")


@pytest.fixture
def client(mocker: MockerFixture, app: FastAPI) -> TestClient:
    app.dependency_overrides[get_config] = get_config_override

    client = TestClient(app)

    return client


@pytest.fixture(scope="module", autouse=True)
def index_fixture() -> Generator[None, None, None]:
    """ensure that the index for this test is teared down after the last test of the module"""
    from azure.search.documents.indexes import SearchIndexClient
    from azure.core.credentials import AzureKeyCredential

    azure_config = get_config_override()

    endpoint = azure_config.store_azure_ai_search_service_endpoint
    api_key = azure_config.store_azure_ai_search_service_api_key
    assert endpoint is not None
    assert api_key is not None
    client = SearchIndexClient(
        endpoint,
        AzureKeyCredential(api_key.get_secret_value()),
    )

    index = azure_config.store_azure_ai_search_service_index_name
    before = [i.name for i in client.list_indexes()]
    print("Indexes before:", before)
    # this might happen when someone creates indexes manually or the interpreter crashes
    # during a test, such that the code after the `yield` is not executed
    # if the limits of the testing Azure AI Search index changes, we might need to change this code
    if len(before) >= 3:
        raise Exception(
            f"There are already 3 Indexes in {azure_config.store_azure_ai_search_service_endpoint}, "
            "please wait for one running test to finish or delete at least one of them"
            "if you think it is a remnant of a crashed test"
        )
    # delete all testing indexes like this
    # for i in before:
    #     client.delete_index(i)

    yield

    client.delete_index(index)
    after = [i.name for i in client.list_indexes()]
    print("Indexes after:", after)


def wait_for_azure() -> None:
    # it seems that our requests for newly generated files are too fast, so we need to wait after each post
    sleep(1)


@pytest.mark.withoutresponses
def test_file_lifecycle(client: TestClient, faker: Faker) -> None:
    # post file
    filename1 = faker.file_name(extension="txt")
    input_content1 = faker.text()
    f = BytesIO(input_content1.encode())
    response = client.post(
        "/files",
        data=f,  # type: ignore[arg-type]
        headers={
            "bucket": "1",
            "id": "1",
            "fileName": filename1,
            "fileMimeType": "text/plain",
        },
    )

    assert response.status_code == 200
    wait_for_azure()

    # get file
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})

    content = response.json()
    assert content["files"][0]["content"] == input_content1
    assert content["files"][0]["metadata"]["source"] == filename1
    assert content["debug"] == f"## Sources\n\n* {filename1}"
    assert "doc_id" in content["files"][0]["metadata"]

    # ensure that internal metadata is cleaned
    assert "bucket" not in content["files"][0]["metadata"]

    # upload a second file
    filename2 = faker.file_name(extension="txt")
    input_content2 = faker.text()
    f = BytesIO(input_content2.encode())
    response = client.post(
        "/files",
        data=f,  # type: ignore[arg-type]
        headers={
            "bucket": "1",
            "id": "2",
            "fileName": filename2,
            "fileMimeType": "text/plain",
        },
    )

    assert response.status_code == 200

    # upload a file to a different bucket
    filename3 = faker.file_name(extension="txt")
    input_content3 = faker.text()
    f = BytesIO(input_content3.encode())
    response = client.post(
        "/files",
        data=f,  # type: ignore[arg-type]
        headers={
            "bucket": "2",
            "id": "3",
            "fileName": filename3,
            "fileMimeType": "text/plain",
        },
    )

    assert response.status_code == 200
    wait_for_azure()

    # ensure that we find only our bucket
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})

    content = response.json()
    assert len(content["files"]) == 2
    found_files = {content["files"][0]["metadata"]["source"], content["files"][1]["metadata"]["source"]}
    assert found_files == {filename1, filename2}

    # ensure that we find only the specified ids (3 is not found, because of the wrong bucket)
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "files": "2,3"})

    content = response.json()
    assert len(content["files"]) == 1
    assert content["files"][0]["metadata"]["source"] == filename2

    # ensure that we find nothing if an empty string is given for the file ids
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "files": ""})

    content = response.json()
    assert len(content["files"]) == 0

    # delete file
    response = client.delete("/files/1")

    assert response.status_code == 200
    wait_for_azure()

    # ensure we do not find it anymore
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})

    content = response.json()
    assert len(content["files"]) == 1
    assert content["files"][0]["metadata"]["source"] == filename2
