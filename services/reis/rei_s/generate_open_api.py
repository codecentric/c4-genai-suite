from sys import argv
import json

from fastapi.openapi.utils import get_openapi

from rei_s.app_factory import create


def generate() -> None:
    filename = "reis-spec.json" if "--no-dev" in argv else "reis-dev-spec.json"
    app = create()

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


if __name__ == "__main__":
    generate()
