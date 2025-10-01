from contextlib import contextmanager
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Generator
import uuid

from pydantic import BaseModel, Field
from rei_s.utils import get_new_file_path


class SourceFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    path: str | Path
    mime_type: str
    file_name: str

    @property
    def size(self) -> int:
        return os.path.getsize(self.path)

    @property
    def buffer(self) -> bytes:
        with open(self.path, "rb") as f:
            return f.read()

    @staticmethod
    def new_temporary_file(buffer: bytes | None = None, extension: str | None = None) -> "SourceFile":
        id_ = str(uuid.uuid4())
        file_name = id_

        if extension and not extension.startswith("."):
            extension = "." + extension
        if extension:
            file_name += extension

        path = get_new_file_path(file_name)

        if buffer:
            with open(path, "wb") as f:
                f.write(buffer)

        return SourceFile(id=id_, path=path, mime_type="", file_name=file_name)

    def delete(self) -> None:
        os.remove(self.path)

    def ext(self) -> str:
        return Path(self.file_name).suffix[1:]


@contextmanager
def temp_file(
    buffer: bytes, extension: str | None = None, mime_type: str = "", file_name: str | None = None
) -> Generator[SourceFile, None, None]:
    """Creates a temporary file with the given content, which is deleted on leaving the context"""
    # note that the tempfiles will be created in the directory defined in the env variable `TMP_FILES_ROOT`
    # or `/tmp` if unspecified
    if extension and not extension.startswith("."):
        extension = "." + extension

    f = NamedTemporaryFile(suffix=extension)
    f.write(buffer)
    f.flush()

    if not file_name:
        file_name = f.name

    try:
        yield SourceFile(path=f.name, mime_type=mime_type, file_name=file_name)
    finally:
        f.close()
