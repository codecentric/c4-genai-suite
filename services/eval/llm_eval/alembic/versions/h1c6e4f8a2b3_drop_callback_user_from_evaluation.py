"""drop callback_user_id and callback_user_name from evaluation

Revision ID: h1c6e4f8a2b3
Revises: g9b5d3e7f8a1
Create Date: 2026-05-08 10:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "h1c6e4f8a2b3"
down_revision: Union[str, None] = "g9b5d3e7f8a1"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("evaluation", "callback_user_id", schema="llm_eval")
    op.drop_column("evaluation", "callback_user_name", schema="llm_eval")


def downgrade() -> None:
    op.add_column(
        "evaluation",
        sa.Column("callback_user_id", sa.String(36), nullable=True),
        schema="llm_eval",
    )
    op.add_column(
        "evaluation",
        sa.Column("callback_user_name", sa.String(255), nullable=True),
        schema="llm_eval",
    )
