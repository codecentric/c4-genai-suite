import pytest
from fastapi.testclient import TestClient
from langchain_community.embeddings import FakeEmbeddings
from langchain_core.documents import Document

from rei_s.services.stores.devnull_store import DevNullStoreAdapter


@pytest.fixture
def client(app):
    client = TestClient(app)
    return client


def test_get_files_fail(client):
    response = client.get("/files")
    # missing required args
    assert response.status_code == 422


def test_get_documents_content_without_parameters(client):
    response = client.get("/documents/content")
    assert response.status_code == 422
    assert response.json()["detail"][0]["msg"] == "Field required"


def test_get_documents_content(mocker, client):
    mocked_document1 = Document(
        page_content="test string", metadata={"source": "testfile.pdf", "format": "pdf", "mime_type": "application/pdf"}
    )
    mocked_document2 = Document(
        page_content="test string 2",
        metadata={"source": "testfile2.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_store = DevNullStoreAdapter()

    mocker.patch.object(mocked_store, "get_documents", autospec=True, return_value=[mocked_document1, mocked_document2])
    mocker.patch("rei_s.services.store_service.get_documents_content", return_value=["test string", "test string 2"])

    response = client.get("/documents/content", params={"chunk_ids": ["1", "2"]})

    content = response.json()
    assert response.status_code == 200
    assert len(content) == 2
    assert content[0] == "test string"
    assert content[1] == "test string 2"


def test_get_files(mocker, client):
    mocked_document1 = Document(
        page_content="test string", metadata={"source": "testfile.pdf", "format": "pdf", "mime_type": "application/pdf"}
    )
    mocked_document2 = Document(
        page_content="test string 2",
        metadata={"source": "testfile2.pdf", "format": "pdf", "mime_type": "application/pdf"},
    )
    mocked_store = DevNullStoreAdapter()
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


def test_get_files_sources(mocker, client):
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
    mocked_store = DevNullStoreAdapter()
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


def test_get_files_sources_page_concat(mocker, client):
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
    mocked_store = DevNullStoreAdapter()
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


def test_get_files_sources_no_page(mocker, client):
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
    mocked_store = DevNullStoreAdapter()
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


def test_get_files_no_files(mocker, client):
    mocked_store = DevNullStoreAdapter()
    mocker.patch.object(mocked_store, "similarity_search", autospec=True, return_value=[])
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=mocked_store)

    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3"})
    assert response.status_code == 200

    content = response.json()
    assert len(content["files"]) == 0
    assert content["debug"] == ""


def test_add_files_fail(client):
    response = client.post("/files")
    # missing required args
    assert response.status_code == 422


def test_add_files(mocker, client):
    # mock embeddings to avoid calls to azure
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    # mock store to avoid calls to the db
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullStoreAdapter())

    with open("tests/data/birthdays.pdf", "rb") as f:
        response = client.post(
            "/files",
            data=f,
            headers={
                "bucket": "15",
                "id": "1",
                "fileName": "test.pdf",
                "fileMimeType": "application/pdf",
            },
        )
    assert response.status_code == 200


def test_process_files(mocker, client):
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

    with open("tests/data/birthdays.pdf", "rb") as f:
        response = client.post(
            "/files/process",
            data=f,
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


def test_add_damaged_file(mocker, client):
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullStoreAdapter())

    with open("tests/data/birthdays.pptx", "rb") as f:
        response = client.post(
            "/files",
            data=f,
            headers={
                "bucket": "15",
                "id": "1",
                "fileName": "test.pdf",
                "fileMimeType": "application/pdf",
            },
        )
    assert response.status_code == 400
    assert "Processing failed" in response.text


def test_add_damaged_large_file(mocker, client):
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullStoreAdapter())

    with open("tests/data_stress/gg.pdf", "rb") as f:
        response = client.post(
            "/files",
            data=f,
            headers={
                "id": "1",
                "bucket": "15",
                "fileName": "test.docx",
                "fileMimeType": "",
            },
        )
    assert response.status_code == 400
    assert "Processing failed" in response.text


def test_add_unsupported_file(mocker, client):
    mocker.patch("rei_s.services.embeddings_provider.get_embeddings", return_value=FakeEmbeddings(size=1352))
    mocker.patch("rei_s.services.store_service.get_vector_store", return_value=DevNullStoreAdapter())

    with open("tests/data/birthdays.pdf", "rb") as f:
        response = client.post(
            "/files",
            data=f,
            headers={
                "id": "1",
                "bucket": "15",
                "fileName": "test.xyz",
                "fileMimeType": "application/xzy",
            },
        )
    assert response.status_code == 415
    assert "File format not supported" in response.text


def test_file_types(client):
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


def test_bad_index_name(client):
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "indexName"})
    assert response.status_code == 422
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "index-name%"})
    assert response.status_code == 422
    response = client.get("/files", params={"query": "test", "bucket": "1", "take": "3", "indexName": "i"})
    assert response.status_code == 422


def test_health(client):
    response = client.get("/health")
    assert response.status_code == 200
