"""chat references to cycle work

Revision ID: 010
Revises: 009
Create Date: 2026-10-13 11:00:00.000000
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "010"
down_revision: str | None = "009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "chat_message_references",
        sa.Column("message_id", sa.String(length=36), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), nullable=False),
        sa.Column("kind", sa.String(length=16), nullable=False),
        sa.Column("target_id", sa.String(length=36), nullable=False),
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("kind IN ('objective', 'activity')", name="ck_chat_reference_kind"),
        sa.ForeignKeyConstraint(["cycle_id"], ["program_cycles.id"]),
        sa.ForeignKeyConstraint(["message_id"], ["channel_messages.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("message_id", "kind", "target_id", name="uq_chat_message_reference"),
    )
    op.create_index(op.f("ix_chat_message_references_message_id"), "chat_message_references", ["message_id"])
    op.create_index(op.f("ix_chat_message_references_cycle_id"), "chat_message_references", ["cycle_id"])
    op.create_index(op.f("ix_chat_message_references_target_id"), "chat_message_references", ["target_id"])


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_message_references_target_id"), table_name="chat_message_references")
    op.drop_index(op.f("ix_chat_message_references_cycle_id"), table_name="chat_message_references")
    op.drop_index(op.f("ix_chat_message_references_message_id"), table_name="chat_message_references")
    op.drop_table("chat_message_references")
