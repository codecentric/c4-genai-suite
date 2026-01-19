from pathlib import Path

PROJECT_ROOT_DIR = Path(__file__).parent.parent.parent.parent.absolute()
BACKEND_DIR = Path(__file__).parent.parent.parent.absolute()
BACKEND_CORE_DIR = Path(__file__).parent.parent.absolute()

DATA_DIR = PROJECT_ROOT_DIR / "data"

RESULT_DIR = DATA_DIR / "results"

ALEMBIC_INI = BACKEND_CORE_DIR / "alembic.ini"
ALEMBIC_DIR = BACKEND_CORE_DIR / "alembic"

TEST_DIR = BACKEND_DIR / "tests"
