from contextlib import contextmanager
import os
from pathlib import Path
from tempfile import NamedTemporaryFile
from typing import Generator, Optional
import uuid

from pydantic import BaseModel, Field
from rei_s.utils import get_new_file_path


class SourceFile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    path: str | Path
    mime_type: str
    file_name: str

    # flag to signal that the parent directory should be deleted when deleting the file
    delete_dir: bool = False

    # this can be used to cache a pdf version of the file as microoptimization
    # some format providers work by converting the file to pdf first, so this avoids repeated conversions
    preview_pdf_cache: Optional["SourceFile"] = None

    @property
    def size(self) -> int:
        return os.path.getsize(self.path)

    @property
    def exists(self) -> bool:
        return os.path.exists(self.path)

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
        if self.preview_pdf_cache:
            self.preview_pdf_cache.delete()
            self.preview_pdf_cache = None
        if self.exists:
            os.remove(self.path)
        if self.delete_dir and os.path.isdir(os.path.dirname(self.path)):
            os.rmdir(os.path.dirname(self.path))

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
