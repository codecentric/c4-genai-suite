import io
import json
from typing import Literal

from loguru import logger
from openpyxl import Workbook
import pandas as pd
import yaml


type SupportedByteConversionFormat = Literal["csv", "json", "yaml", "xlsx"]


def to_bytes_with_format(
    data: object,
    format: SupportedByteConversionFormat,
) -> tuple[bytes, str] | None:
    match format:
        case "json":
            data_bytes = json.dumps(data, indent=2).encode("utf-8")
            data_type = "application/json"
        case "csv":
            df = pd.DataFrame(data)

            csv_buffer = io.StringIO()
            df.to_csv(csv_buffer, index=False)
            csv_string = csv_buffer.getvalue()

            data_bytes = csv_string.encode("utf-8")
            data_type = "text/csv"
        case "yaml":
            data_bytes = yaml.dump(
                data, default_flow_style=False, sort_keys=False
            ).encode("utf-8")
            data_type = "application/x-yaml"
        case "xlsx":
            if not isinstance(data, Workbook):
                logger.error(
                    "The selected format was xlsx"
                    "but given data is not a valiud instance of pyxlsx.Workbook"
                )
                return None

            excel_buffer = io.BytesIO()
            data.save(excel_buffer)
            excel_buffer.seek(0)

            data_bytes = excel_buffer.getvalue()
            data_type = (
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            )
        case _:
            raise ValueError(f"Unsupported format: {format}")

    return data_bytes, data_type
