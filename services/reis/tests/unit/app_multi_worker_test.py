from fastapi import FastAPI
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings

from pytest_mock import MockerFixture
from rei_s.config import Config, get_config
from rei_s.services.vectorstores.devnull_store import DevNullStoreAdapter
from tests.conftest import get_test_config


def get_config_override() -> Config:
    return get_test_config(
        dict(
            workers=2,
            metrics_port=0,  # disable prometheus
            batch_size=4,
            filesize_threshold=3 * 10**4,
        )
    )


def test_add_files_multiple_workers(mocker: MockerFixture, app: FastAPI) -> None:
    app.dependency_overrides[get_config] = get_config_override

    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    # mock store to avoid calls to the db
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullStoreAdapter())

    # for the multiple worker to work, we need to use the client as a context
    with TestClient(app) as client:
        with open("tests/data/birthdays.pdf", "rb") as f:
            response = client.post(
                "/files",
                data=f,  # type: ignore[arg-type]
                headers={
                    "bucket": "15",
                    "id": "1",
                    "fileName": "test.pdf",
                    "fileMimeType": "application/pdf",
                },
            )

        assert response.status_code == 200


def test_process_files_multiple_workers(mocker: MockerFixture, app: FastAPI) -> None:
    app.dependency_overrides[get_config] = get_config_override
    # mock embeddings to assure that they are not generated
    mocker.patch(
        "rei_s.services.embeddings_provider.get_embeddings",
        return_value=FakeEmbeddings(size=1352),
        side_effect=Exception("embeddings generated, but should not"),
    )
    # mock store to assure that nothing is saved
    mocker.patch(
        "rei_s.services.store_service.get_vector_store",
        return_value=DevNullStoreAdapter(),
        side_effect=Exception("vectorstore accessed, but should not"),
    )

    with TestClient(app) as client:
        with open("tests/data/birthdays.pdf", "rb") as f:
            response = client.post(
                "/files/process",
                data=f,  # type: ignore[arg-type]
                headers={
                    "bucket": "15",
                    "id": "1",
                    "fileName": "test.pdf",
                    "fileMimeType": "application/pdf",
                },
            )
    assert response.status_code == 200
    json = response.json()
    assert any("Darkwing Duck" in chunk["content"] for chunk in json["chunks"])
    assert any("Daniel Düsentrieb" in chunk["content"] for chunk in json["chunks"])
