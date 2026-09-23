"""informes

Revision ID: 006
Revises: 005
Create Date: 2026-09-23

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "006"
down_revision: str | None = "005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "technical_reports",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("entrepreneurship_id", sa.String(length=36), nullable=False),
        sa.Column("cycle_id", sa.String(length=36), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=False),
        sa.Column("period_end", sa.Date(), nullable=False),
        sa.Column("kind", sa.String(length=32), nullable=False),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("narrative", sa.Text(), nullable=False),
        sa.Column("composition", sa.JSON(), nullable=False),
        sa.Column("supersedes_id", sa.String(length=36), nullable=True),
        sa.Column("reviewed_by", sa.String(length=36), nullable=True),
        sa.Column("approved_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("pdf_storage_key", sa.String(length=500), nullable=True),
        sa.Column("pdf_generated_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_by", sa.String(length=36), nullable=False),
        sa.Column("revision", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.CheckConstraint("status IN ('borrador', 'aprobado')", name="ck_report_status"),
        sa.CheckConstraint(
            "status != 'aprobado' OR (reviewed_by IS NOT NULL AND approved_at IS NOT NULL)",
            name="ck_report_review",
        ),
        sa.CheckConstraint("period_start <= period_end", name="ck_report_period"),
        sa.CheckConstraint("version > 0", name="ck_report_version"),
        sa.CheckConstraint("revision > 0", name="ck_report_revision"),
        sa.ForeignKeyConstraint(["entrepreneurship_id"], ["entrepreneurships.id"]),
        sa.ForeignKeyConstraint(["cycle_id"], ["program_cycles.id"]),
        sa.ForeignKeyConstraint(["supersedes_id"], ["technical_reports.id"]),
        sa.ForeignKeyConstraint(["reviewed_by"], ["users.id"]),
        sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "cycle_id", "period_start", "period_end", "kind", "version", name="uq_report_version"
        ),
    )
    op.create_index(
        op.f("ix_technical_reports_entrepreneurship_id"),
        "technical_reports",
        ["entrepreneurship_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_technical_reports_cycle_id"), "technical_reports", ["cycle_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_technical_reports_cycle_id"), table_name="technical_reports")
    op.drop_index(op.f("ix_technical_reports_entrepreneurship_id"), table_name="technical_reports")
    op.drop_table("technical_reports")
