from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from glob import glob
import os
from time import perf_counter
from typing import Callable, Generator
import pytest
import requests


base_url = os.getenv("TEST_REIS_URL", "http://localhost:3201")

file_set = [
    # large files
    glob("tests/data_stress/*.pdf"),
    glob("tests/data_stress/*.pdf") + glob("tests/data_stress/*.docx"),
    # these include a large excel sheet
    glob("tests/data_stress/*.*"),
    # many files
    ["tests/data/birthdays.pdf"] * 70 + ["tests/data/birthdays.docx"] * 30,
]


def process(url: str, filename: str) -> requests.Response:
    return requests.post(
        f"{url}/files/process",
        data=open(filename, "rb"),
        headers={
            "fileName": filename,
            "fileMimeType": "unknown",
        },
    )


def process_and_add(url: str, n: int, filename: str) -> requests.Response:
    return requests.post(
        f"{url}/files",
        data=open(filename, "rb"),
        headers={
            "bucket": "31415926",
            "id": f"{n}",
            "fileName": filename,
            "fileMimeType": "unknown",
        },
    )


@contextmanager
def catchtime() -> Generator[Callable[[], float], None, None]:
    t1 = t2 = perf_counter()
    yield lambda: t2 - t1
    t2 = perf_counter()


def test_lfs_files_available() -> None:
    lfs_file = "tests/data_stress/dracula.pdf"
    file_size = os.path.getsize(lfs_file)
    assert file_size > 1000, (
        "Apparently git lfs is not configured. "
        "Please install it and do `git lfs pull` to fetch large files needed for this test."
    )


@pytest.mark.stress
@pytest.mark.withoutresponses
@pytest.mark.parametrize("files", file_set)
def test_process_files(files: list[str]) -> None:
    assert len(files) > 0
    # for just processing, we process every file 2 times, because processing is faster than adding
    files = files * 2

    futures = []

    with catchtime() as t:
        with ThreadPoolExecutor(max_workers=100) as executor:
            for filename in files:
                future = executor.submit(process, base_url, filename)
                futures.append(future)

    for f in futures:
        assert f.result().status_code == 200

    # assert that it finishes within a time limit (in seconds)
    # note that this is dependent on the runtime and should be treated with care
    assert t() < 1200

    # assert that it finishes within memory constraints
    # since we call an external process, we rely on Kubernetes to kill it if it goes above
    # memory limits and thus fails the pipeline


@pytest.mark.stress
@pytest.mark.withoutresponses
@pytest.mark.parametrize("files", file_set)
def test_process_embed_and_add_files(files: list[str]) -> None:
    assert len(files) > 0
    futures = []

    with catchtime() as t:
        with ThreadPoolExecutor(max_workers=100) as executor:
            for n, filename in enumerate(files, start=42):
                future = executor.submit(process_and_add, base_url, n, filename)
                futures.append(future)

    for f in futures:
        assert f.result().status_code == 200

    # assert that it finishes within a time limit (in seconds)
    # note that this is dependent on the runtime and should be treated with care
    assert t() < 600

    # assert that it finishes within memory constraints
    # since we call an external process, we rely on Kubernetes to kill it if it goes above
    # memory limits and thus fails the pipeline
