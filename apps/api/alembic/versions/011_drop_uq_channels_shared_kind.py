"""drop uq_channels_shared_kind on channels

Revision ID: 011_drop_uq_channels_shared_kind
Revises: 010_chat_message_references
Create Date: 2026-10-23 12:00:00.000000

"""

from alembic import op

revision = "011_drop_uq_channels_shared_kind"
down_revision = "010"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.drop_index("uq_channels_shared_kind", table_name="channels")


def downgrade() -> None:
    op.create_index(
        "uq_channels_shared_kind",
        "channels",
        ["entrepreneurship_id", "kind"],
        unique=True,
    )
