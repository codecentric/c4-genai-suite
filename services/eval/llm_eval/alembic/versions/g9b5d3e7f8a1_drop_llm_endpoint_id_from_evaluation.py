"""drop llm_endpoint_id from evaluation

Revision ID: g9b5d3e7f8a1
Revises: f8a3b2c4d5e6
Create Date: 2026-02-16 14:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "g9b5d3e7f8a1"
down_revision: Union[str, None] = "f8a3b2c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        "evaluation_llm_endpoint_id_fkey", "evaluation", schema="llm_eval"
    )
    op.drop_column("evaluation", "llm_endpoint_id", schema="llm_eval")


def downgrade() -> None:
    op.add_column(
        "evaluation",
        sa.Column("llm_endpoint_id", sa.String(36), nullable=True),
        schema="llm_eval",
    )
    op.create_foreign_key(
        "evaluation_llm_endpoint_id_fkey",
        "evaluation",
        "llm_endpoint",
        ["llm_endpoint_id"],
        ["id"],
        source_schema="llm_eval",
        referent_schema="llm_eval",
    )
