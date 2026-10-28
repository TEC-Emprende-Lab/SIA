"""US-COM-001: restore uniqueness without modifying channel history.

Revision ID: 012
Revises: 011_drop_uq_channels_shared_kind
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "012"
down_revision: str | None = "011_drop_uq_channels_shared_kind"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        bind.execute(sa.text("LOCK TABLE channels IN SHARE ROW EXCLUSIVE MODE"))
    duplicate = bind.execute(
        sa.text(
            "SELECT entrepreneurship_id, kind FROM channels "
            "WHERE cycle_id IS NULL AND kind IS NOT NULL "
            "GROUP BY entrepreneurship_id, kind HAVING COUNT(*) > 1 LIMIT 1"
        )
    ).first()
    if duplicate is not None:
        raise RuntimeError(
            "US-COM-001: duplicate shared channel kinds; migration stopped. "
            "Resolve duplicates with an approved history-preserving procedure before retrying."
        )
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
