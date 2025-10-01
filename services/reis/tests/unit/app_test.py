from fastapi import FastAPI
import pytest
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings
from langchain_core.documents import Document

from pytest_mock import MockerFixture
from rei_s.services.filestores.devnull import DevNullFileStoreAdapter
from rei_s.services.vectorstores.devnull_store import DevNullVectorStoreAdapter


@pytest.fixture
def client(app: FastAPI) -> TestClient:
    client = TestClient(app)
    return client


def test_get_files_fail(client: TestClient) -> None:
    response = client.get("/files")
    # missing required args
    assert response.status_code == 422


def test_get_documents_content_without_parameters(client: TestClient) -> None:
    response = client.get("/documents/content")
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


def test_get_documents_content(mocker: MockerFixture, client: TestClient) -> None:
    mocked_document1 = Document(
        page_content="test string", metadata={"source": "testfile.pdf", "format": "pdf", "mime_type": "application/pdf"}
    )
    mocked_document2 = Document(
        page_content="test string 2",
        metadata={"source": "testfile2.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_store = DevNullVectorStoreAdapter()

    mocker.patch.object(mocked_store, "get_documents", autospec=True, return_value=[mocked_document1, mocked_document2])
    mocker.patch("rei_s.services.store_service.get_documents_content", return_value=["test string", "test string 2"])

    response = client.get("/documents/content", params={"chunk_ids": ["1", "2"]})

    content = response.json()
    assert response.status_code == 200
    assert len(content) == 2
    assert content[0] == "test string"
    assert content[1] == "test string 2"


def test_get_files(mocker: MockerFixture, client: TestClient) -> None:
    mocked_document1 = Document(
        page_content="test string", metadata={"source": "testfile.pdf", "format": "pdf", "mime_type": "application/pdf"}
    )
    mocked_document2 = Document(
        page_content="test string 2",
        metadata={"source": "testfile2.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_store = DevNullVectorStoreAdapter()
    mocker.patch.object(
        mocked_store, "similarity_search", autospec=True, return_value=[mocked_document1, mocked_document2]
    )
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": ""})
    assert response.status_code == 200

    content = response.json()
    assert content["files"][0]["content"] == "test string"
    assert content["files"][0]["metadata"]["source"] == "testfile.pdf"
    assert content["debug"] == "## Sources\n\n* testfile.pdf\n* testfile2.pdf"


def test_get_files_sources(mocker: MockerFixture, client: TestClient) -> None:
    mocked_document_a1 = Document(
        page_content="test string 1",
        metadata={"source": "testfile.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_document_b1 = Document(
        page_content="test string 2",
        metadata={"source": "testfile2.xml", "format": "xml", "mime_type": "application/xml"},
    )
    mocked_document_c1 = Document(
        page_content="test string 3",
        metadata={"source": "testfile3.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_store = DevNullVectorStoreAdapter()
    mocker.patch.object(
        mocked_store,
        "similarity_search",
        autospec=True,
        return_value=[mocked_document_a1, mocked_document_b1, mocked_document_c1],
    )
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["sources"]) == 3
    assert content["sources"][0]["document"]["mimeType"] == "application/pdf"
    assert content["sources"][1]["document"]["mimeType"] == "application/xml"
    assert content["sources"][2]["document"]["mimeType"] == "application/pdf"


def test_get_files_sources_page_concat(mocker: MockerFixture, client: TestClient) -> None:
    mocked_document_a1 = Document(
        page_content="test string 1",
        metadata={"source": "testfile_a.pdf", "format": "pdf", "mime_type": "application/pdf", "page": 5},
    )
    mocked_document_a2 = Document(
        page_content="test string 2",
        metadata={"source": "testfile_a.pdf", "format": "pdf", "mime_type": "application/pdf", "page": "9"},
    )
    mocked_document_a3 = Document(
        page_content="test string 3",
        metadata={"source": "testfile_a.pdf", "format": "pdf", "mime_type": "application/pdf", "page": "4"},
    )
    mocked_document_b1 = Document(
        page_content="test string 2",
        metadata={"source": "testfile_b.pdf", "format": "pdf", "mime_type": "application/pdf", "page": 109},
    )
    mocked_document_b2 = Document(
        page_content="test string 3",
        metadata={"source": "testfile_b.pdf", "format": "pdf", "mime_type": "application/pdf", "page": "42"},
    )
    mocked_store = DevNullVectorStoreAdapter()
    mocker.patch.object(
        mocked_store,
        "similarity_search",
        autospec=True,
        return_value=[
            mocked_document_a1,
            mocked_document_a2,
            mocked_document_a3,
            mocked_document_b1,
            mocked_document_b2,
        ],
    )
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["sources"]) == 5
    assert content["sources"][0]["chunk"]["pages"] == [5]
    assert content["sources"][1]["chunk"]["pages"] == [9]
    assert content["sources"][2]["chunk"]["pages"] == [4]
    assert content["sources"][3]["chunk"]["pages"] == [109]
    assert content["sources"][4]["chunk"]["pages"] == [42]


def test_get_files_sources_no_page(mocker: MockerFixture, client: TestClient) -> None:
    mocked_document_a1 = Document(
        page_content="test string 1",
        metadata={"source": "testfile_a.pdf", "format": "pdf", "mime_type": "application/pdf", "page": "5"},
    )
    mocked_document_b1 = Document(
        page_content="test string 2",
        metadata={"source": "testfile_b.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_document_b2 = Document(
        page_content="test string 3",
        metadata={"source": "testfile_b.pdf", "format": "pdf", "mime_type": "application/pdf", "page": "another value"},
    )
    mocked_store = DevNullVectorStoreAdapter()
    mocker.patch.object(
        mocked_store,
        "similarity_search",
        autospec=True,
        return_value=[
            mocked_document_a1,
            mocked_document_b1,
            mocked_document_b2,
        ],
    )
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["sources"]) == 3
    assert content["sources"][0]["chunk"]["pages"] == [5]
    assert content["sources"][1]["chunk"]["pages"] is None
    assert content["sources"][2]["chunk"]["pages"] is None


def test_get_files_no_files(mocker: MockerFixture, client: TestClient) -> None:
    mocked_store = DevNullVectorStoreAdapter()
    mocker.patch.object(mocked_store, "similarity_search", autospec=True, return_value=[])
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 0
    assert content["debug"] == ""


def test_add_files_fail(client: TestClient) -> None:
    response = client.post("/files")
    # missing required args
    assert response.status_code == 422


def test_add_files_without_filestore(mocker: MockerFixture, client: TestClient) -> None:
    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    # mock store to avoid calls to the db
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())
    # mock file store to ensure it is not used
    mocker.patch(
        "rei_s.services.store_service.get_file_store",
        return_value=DevNullFileStoreAdapter(),
        side_effect=Exception("filestore accessed, but should not"),
    )

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


def test_add_files_with_filestore(mocker: MockerFixture, client: TestClient) -> None:
    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    vector_store_mock = mocker.Mock(spec=DevNullVectorStoreAdapter)
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=vector_store_mock)
    file_store_mock = mocker.Mock(spec=DevNullFileStoreAdapter)
    mocker.patch("rei_s.services.store_service.get_file_store", return_value=file_store_mock)

    with open("tests/data/birthdays.yaml", "rb") as f:
        response = client.post(
            "/files",
            data=f,  # type: ignore[arg-type]
            headers={
                "bucket": "15",
                "id": "1",
                "fileName": "test.yaml",
                "fileMimeType": "application/yaml",
            },
        )
    assert response.status_code == 200

    vector_store_mock.add_documents.assert_called_once()
    file_store_mock.add_document.assert_called_once()

    args, _kwargs = vector_store_mock.add_documents.call_args
    assert "Dagobert Duck" in args[0].page_content


def test_process_files(mocker: MockerFixture, client: TestClient) -> None:
    # mock embeddings to assure that they are not generated
    mocker.patch(
        "rei_s.services.embeddings_provider.get_embeddings",
        return_value=FakeEmbeddings(size=1352),
        side_effect=Exception("embeddings generated, but should not"),
    )
    # mock store to assure that nothing is saved
    mocker.patch(
        "rei_s.services.store_service.get_vector_store",
        return_value=DevNullVectorStoreAdapter(),
        side_effect=Exception("vectorstore accessed, but should not"),
    )

    with open("tests/data/birthdays.pdf", "rb") as f:
        response = client.post(
            "/files/process",
            data=f,  # type: ignore[arg-type]
            headers={
                "id": "1",
                "fileName": "test.pdf",
                "fileMimeType": "application/pdf",
            },
        )
    assert response.status_code == 200
    json = response.json()
    assert any("Darkwing Duck" in chunk["content"] for chunk in json["chunks"])
    assert any("Daniel Düsentrieb" in chunk["content"] for chunk in json["chunks"])


def test_add_damaged_file(mocker: MockerFixture, client: TestClient) -> None:
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())

    with open("tests/data/birthdays.pptx", "rb") as f:
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
    assert response.status_code == 400
    assert "Processing failed" in response.text


def test_add_damaged_large_file(mocker: MockerFixture, client: TestClient) -> None:
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())

    with open("tests/data_stress/gg.pdf", "rb") as f:
        response = client.post(
            "/files",
            data=f,  # type: ignore[arg-type]
            headers={
                "id": "1",
                "bucket": "15",
                "fileName": "test.docx",
                "fileMimeType": "",
            },
        )
    assert response.status_code == 400
    assert "Processing failed" in response.text


def test_add_unsupported_file(mocker: MockerFixture, client: TestClient) -> None:
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullVectorStoreAdapter())

    with open("tests/data/birthdays.pdf", "rb") as f:
        response = client.post(
            "/files",
            data=f,  # type: ignore[arg-type]
            headers={
                "id": "1",
                "bucket": "15",
                "fileName": "test.xyz",
                "fileMimeType": "application/xzy",
            },
        )
    assert response.status_code == 415
    assert "File format not supported" in response.text


def test_file_types(client: TestClient) -> None:
    response = client.get("/files/types")
    assert response.status_code == 200

    extensions = set([i["file_name_extension"] for i in response.json()["items"]])

    # assert that the main formats we need are signalled to be supported
    assert ".md" in extensions
    assert ".pdf" in extensions
    assert ".docx" in extensions
    assert ".xlsx" in extensions
    assert ".pptx" in extensions
    assert ".json" in extensions
    assert ".xml" in extensions
    assert ".yml" in extensions


def test_bad_index_name(client: TestClient) -> None:
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "indexName"})
    assert response.status_code == 422
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "index-name%"})
    assert response.status_code == 422
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "i"})
    assert response.status_code == 422


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
