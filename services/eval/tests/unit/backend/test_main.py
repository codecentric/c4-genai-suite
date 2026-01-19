import os
from unittest import mock
from fastapi.testclient import TestClient
from llm_eval.main import app


client = TestClient(app)


@mock.patch.dict(os.environ, {"APP_VERSION": "test"})
def test_read_main() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.text == "test"
