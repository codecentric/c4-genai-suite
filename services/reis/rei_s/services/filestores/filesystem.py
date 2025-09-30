import os
from pathlib import Path
from rei_s.config import Config
from rei_s.services.filestore_adapter import FileStoreAdapter
from rei_s.types.source_file import SourceFile


class FSFileStoreAdapter(FileStoreAdapter):
    path: Path

    def add_document(self, document: SourceFile) -> None:
        filename = os.path.basename(document.id)
        path = self.path / filename
        with open(path, "wb") as f:
            f.write(document.buffer)

    def delete(self, doc_id: str) -> None:
        filename = os.path.basename(doc_id)
        path = self.path / filename
        if not path.exists():
            raise FileNotFoundError()
        os.remove(path)

    def get_document(self, doc_id: str) -> SourceFile:
        filename = os.path.basename(doc_id)
        path = self.path / filename
        if not path.exists():
            raise FileNotFoundError()
        return SourceFile(id=doc_id, path=path, mime_type="application/pdf", file_name=f"{doc_id}.pdf")

    def exists(self, doc_id: str) -> bool:
        filename = os.path.basename(doc_id)
        path = self.path / filename
        return path.exists()

    @classmethod
    def create(cls, config: Config) -> "FSFileStoreAdapter":
        ret = FSFileStoreAdapter()

        if config.filestore_filesystem_basepath is None:
            raise ValueError("The env variable `filestore_filesystem_basepath` is missing.")

        ret.path = Path(config.filestore_filesystem_basepath)
        os.makedirs(ret.path, exist_ok=True)
        return ret
