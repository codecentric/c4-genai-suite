"""Development scripts for REI-S."""

import json
import subprocess
import sys

from fastapi.openapi.utils import get_openapi

from rei_s.app_factory import create


def format_code() -> None:
    """Format code with ruff."""
    result = subprocess.run(["ruff", "format", "."])
    sys.exit(result.returncode)


def lint() -> None:
    """Run ruff and ty linting."""
    ruff_result = subprocess.run(["ruff", "check", "."])
    ty_result = subprocess.run(["ty", "check"])

    # Exit with error if either tool failed
    if ruff_result.returncode != 0 or ty_result.returncode != 0:
        sys.exit(1)


def test() -> None:
    """Run pytest."""
    result = subprocess.run(["pytest", *sys.argv[1:]])
    sys.exit(result.returncode)


def stresstest() -> None:
    """Run stress tests against a running REI-S instance."""
    result = subprocess.run(["pytest", "-rs", "--stress", "tests/stress", *sys.argv[1:]])
    sys.exit(result.returncode)


def dev() -> None:
    """Start the development server."""
    result = subprocess.run(["fastapi", "dev", "rei_s/app.py", "--port", "3201", *sys.argv[1:]])
    sys.exit(result.returncode)


def generate_api_spec() -> None:
    """Generate OpenAPI specification."""
    filename = "reis-spec.json" if "--no-dev" in sys.argv else "reis-dev-spec.json"
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
