"""add expediente and access assignments

Revision ID: 002
Revises: 001
Create Date: 2026-09-15

"""

import sqlalchemy as sa

from alembic import op

revision = "002"
down_revision = "001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "entrepreneurships",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False),
    )
    op.create_table(
        "program_enrollments",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("entrepreneurship_id", sa.String(length=36), nullable=False),
        sa.Column("program", sa.String(length=64), nullable=False),
        sa.Column("enrolled_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["entrepreneurship_id"], ["entrepreneurships.id"]),
    )
    op.create_index(
        "ix_program_enrollments_entrepreneurship_id", "program_enrollments", ["entrepreneurship_id"]
    )
    op.create_table(
        "program_cycles",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("enrollment_id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["enrollment_id"], ["program_enrollments.id"]),
    )
    op.create_index("ix_program_cycles_enrollment_id", "program_cycles", ["enrollment_id"])
    for table, scope_column, scope_table in (
        ("entrepreneurship_assignments", "entrepreneurship_id", "entrepreneurships"),
        ("program_cycle_assignments", "program_cycle_id", "program_cycles"),
    ):
        op.create_table(
            table,
            sa.Column("id", sa.String(length=36), primary_key=True),
            sa.Column(scope_column, sa.String(length=36), nullable=False),
            sa.Column("user_id", sa.String(length=36), nullable=False),
            sa.Column("role", sa.String(length=32), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
            sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
            sa.ForeignKeyConstraint([scope_column], [f"{scope_table}.id"]),
            sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        )
        op.create_index(f"ix_{table}_{scope_column}", table, [scope_column])
        op.create_index(f"ix_{table}_user_id", table, ["user_id"])
        name = (
            "uq_cycle_active_assignment"
            if table == "program_cycle_assignments"
            else "uq_entrepreneurship_active_assignment"
        )
        op.create_index(
            name,
            table,
            [scope_column, "user_id", "role"],
            unique=True,
            postgresql_where=sa.text("revoked_at IS NULL"),
            sqlite_where=sa.text("revoked_at IS NULL"),
        )


def downgrade() -> None:
    for table, scope_column in (
        ("program_cycle_assignments", "program_cycle_id"),
        ("entrepreneurship_assignments", "entrepreneurship_id"),
    ):
        op.drop_index(f"ix_{table}_user_id", table_name=table)
        op.drop_index(f"ix_{table}_{scope_column}", table_name=table)
        op.drop_table(table)
    op.drop_index("ix_program_cycles_enrollment_id", table_name="program_cycles")
    op.drop_table("program_cycles")
    op.drop_index("ix_program_enrollments_entrepreneurship_id", table_name="program_enrollments")
    op.drop_table("program_enrollments")
    op.drop_table("entrepreneurships")
