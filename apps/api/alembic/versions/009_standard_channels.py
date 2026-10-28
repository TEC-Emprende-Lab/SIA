"""standard entrepreneurship chat channels

Revision ID: 009
Revises: 008
Create Date: 2026-10-13 10:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "009"
down_revision: str | None = "008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    with op.batch_alter_table("channels") as batch:
        batch.add_column(sa.Column("kind", sa.String(length=32), nullable=True))
    op.create_index(
        "uq_channels_shared_kind",
        "channels",
        ["entrepreneurship_id", "kind"],
        unique=True,
        postgresql_where=sa.text("cycle_id IS NULL AND kind IS NOT NULL"),
        sqlite_where=sa.text("cycle_id IS NULL AND kind IS NOT NULL"),
    )


def downgrade() -> None:
    op.drop_index("uq_channels_shared_kind", table_name="channels")
    op.drop_column("channels", "kind")
