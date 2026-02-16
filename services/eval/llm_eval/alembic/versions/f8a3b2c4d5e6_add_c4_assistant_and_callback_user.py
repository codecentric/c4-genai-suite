"""add c4 assistant and callback user

Revision ID: f8a3b2c4d5e6
Revises: e257b001fc6c
Create Date: 2026-02-16 12:00:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f8a3b2c4d5e6"
down_revision: Union[str, None] = "e257b001fc6c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add callback user fields for service-to-service auth
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
    # Add C4 assistant fields
    op.add_column(
        "evaluation",
        sa.Column("c4_assistant_id", sa.Integer, nullable=True),
        schema="llm_eval",
    )
    op.add_column(
        "evaluation",
        sa.Column("c4_assistant_name", sa.String(255), nullable=True),
        schema="llm_eval",
    )


def downgrade() -> None:
    op.drop_column("evaluation", "c4_assistant_name", schema="llm_eval")
    op.drop_column("evaluation", "c4_assistant_id", schema="llm_eval")
    op.drop_column("evaluation", "callback_user_name", schema="llm_eval")
    op.drop_column("evaluation", "callback_user_id", schema="llm_eval")
