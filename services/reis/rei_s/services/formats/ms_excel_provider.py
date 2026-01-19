from typing import Any

from rei_s.services.formats.office_provider import OfficeProvider


class MsExcelProvider(OfficeProvider):
    name = "ms_excel"

    file_name_extensions = [".xlsx"]

    def __init__(self, chunk_size: int = 1000, chunk_overlap: int = 200, **_kwargs: Any) -> None:
        super().__init__(chunk_size, chunk_overlap, **_kwargs)
