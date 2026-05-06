"""Generate OpenAPI spec from the FastAPI application."""

import json
from sys import argv

from fastapi.openapi.utils import get_openapi

from llm_eval.main import app


def generate() -> None:
    """Generate OpenAPI specification for the eval service."""
    filename = "eval-spec.json" if "--no-dev" in argv else "eval-dev-spec.json"

    with open(filename, "w") as f:
        json.dump(
            get_openapi(
                title=app.title,
                version=app.version,
                openapi_version=app.openapi_version,
                description=app.description,
                routes=app.routes,
            ),
            f,
            indent=2,
        )
        f.write("\n")

    print(f"✅ OpenAPI spec written to {filename}")


if __name__ == "__main__":
    generate()
