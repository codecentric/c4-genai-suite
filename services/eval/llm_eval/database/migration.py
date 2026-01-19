from alembic import command
from alembic.config import Config
from sqlalchemy import Connection
from sqlalchemy.ext.asyncio import AsyncEngine

from llm_eval.config.paths import ALEMBIC_DIR, ALEMBIC_INI


def run_migrations(connection: Connection | None = None) -> None:
    # if we are running in a container expect the ini file in the working dir
    alembic_ini = ALEMBIC_INI

    alembic_cfg = Config(alembic_ini)
    alembic_cfg.attributes["connection"] = connection
    alembic_cfg.set_main_option("script_location", str(ALEMBIC_DIR))

    command.upgrade(alembic_cfg, "head")


async def run_migrations_async(engine: AsyncEngine) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(run_migrations)
