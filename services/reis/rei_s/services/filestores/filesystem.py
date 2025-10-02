import os
from pathlib import Path
from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


def normalized_path(path: Path, base_name: str) -> Path:
    base_name = Path(base_name).resolve().name
    joined_path = path / base_name
    normalized_path = joined_path.resolve()
    if not str(normalized_path).startswith(str(path.resolve())):
        raise Exception("Not allowed: path escapes base directory")
    return normalized_path


class FSFileStoreAdapter(FileStoreAdapter):
    path: Path

    def add_document(self, document: SourceFile) -> None:
        path = normalized_path(self.path, document.id)
        with open(path, "wb") as f:
            f.write(document.buffer)

    def delete(self, doc_id: str) -> None:
        path = normalized_path(self.path, doc_id)
        if not path.exists():
            raise FileNotFoundError()
        os.remove(path)

    def get_document(self, doc_id: str) -> SourceFile:
        path = normalized_path(self.path, doc_id)
        if not path.exists():
            raise FileNotFoundError()
        return SourceFile(id=doc_id, path=path, mime_type="application/pdf", file_name=f"{doc_id}.pdf")

    def exists(self, doc_id: str) -> bool:
        path = normalized_path(self.path, doc_id)
        return path.exists()

    @classmethod
    def create(cls, config: Config) -> "FSFileStoreAdapter":
        ret = FSFileStoreAdapter()

        if config.file_store_filesystem_basepath is None:
            raise ValueError("The env variable `filestore_filesystem_basepath` is missing.")

        ret.path = Path(config.file_store_filesystem_basepath)
        os.makedirs(ret.path, exist_ok=True)
        return ret
