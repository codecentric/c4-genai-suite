"""Generate OpenAPI spec from the FastAPI application."""

import json
from sys import argv

from fastapi.openapi.utils import get_openapi

from llm_eval.main import app


def _fix_binary_fields(obj: object) -> None:
    """Convert contentMediaType to format:binary for proper codegen.

    Newer FastAPI emits `contentMediaType: application/octet-stream` for
    UploadFile fields, but the TypeScript generator expects `format: binary`
    to map them to Blob.
    """
    if isinstance(obj, dict):
        if (
            obj.get("type") == "string"
            and obj.pop("contentMediaType", None) == "application/octet-stream"
        ):
            obj["format"] = "binary"
        for v in obj.values():
            _fix_binary_fields(v)
    elif isinstance(obj, list):
        for item in obj:
            _fix_binary_fields(item)


def generate() -> None:
    """Generate OpenAPI specification for the eval service."""
    filename = "eval-spec.json" if "--no-dev" in argv else "eval-dev-spec.json"

    spec = get_openapi(
        title=app.title,
        version=app.version,
        openapi_version=app.openapi_version,
        description=app.description,
        routes=app.routes,
    )
    _fix_binary_fields(spec)

    with open(filename, "w") as f:
        json.dump(spec, f, indent=2)
        f.write("\n")

    print(f"✅ OpenAPI spec written to {filename}")


if __name__ == "__main__":
    generate()
