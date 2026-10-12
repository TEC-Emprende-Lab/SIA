"""Evidence organization, independent of immutable evidence.

Revision ID: 008
Revises: 007
"""

import sqlalchemy as sa

from alembic import op

revision = "008"
down_revision = "007"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index("uq_evidence_cycle", "evidence_references", ["id", "cycle_id"], unique=True)
    op.create_table(
        "evidence_folders",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("cycle_id", sa.String(36), sa.ForeignKey("program_cycles.id"), nullable=False),
        sa.Column("name", sa.String(200), nullable=False),
        sa.Column("created_by", sa.String(36), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.UniqueConstraint("id", "cycle_id"),
    )
    op.create_index("ix_evidence_folders_cycle_id", "evidence_folders", ["cycle_id"])
    op.create_table(
        "evidence_placements",
        sa.Column(
            "evidence_id", sa.String(36), sa.ForeignKey("evidence_references.id"), primary_key=True
        ),
        sa.Column("cycle_id", sa.String(36), sa.ForeignKey("program_cycles.id"), nullable=False),
        sa.Column("folder_id", sa.String(36), nullable=True),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(
            ["folder_id", "cycle_id"], ["evidence_folders.id", "evidence_folders.cycle_id"]
        ),
        sa.ForeignKeyConstraint(
            ["evidence_id", "cycle_id"], ["evidence_references.id", "evidence_references.cycle_id"]
        ),
    )
    op.create_index("ix_evidence_placements_cycle_id", "evidence_placements", ["cycle_id"])


def downgrade() -> None:
    op.drop_table("evidence_placements")
    op.drop_table("evidence_folders")
    op.drop_index("uq_evidence_cycle", table_name="evidence_references")
