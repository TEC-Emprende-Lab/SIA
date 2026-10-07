"""documents

Revision ID: 007
Revises: 006
Create Date: 2026-10-07

"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "007"
down_revision: str | None = "006"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_SOURCE = (
    "(kind = 'link' AND url IS NOT NULL AND document_id IS NULL) OR "
    "(kind IN ('file', 'photograph', 'video') AND "
    "((url IS NOT NULL AND document_id IS NULL) OR "
    "(url IS NULL AND document_id IS NOT NULL)))"
)


def upgrade() -> None:
    op.create_table(
        "documents",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("entrepreneurship_id", sa.String(length=36), nullable=False),
        sa.Column("storage_key", sa.String(length=500), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("mime", sa.String(length=255), nullable=False),
        sa.Column("size", sa.BigInteger(), nullable=False),
        sa.Column("uploaded_by", sa.String(length=36), nullable=False),
        sa.ForeignKeyConstraint(["entrepreneurship_id"], ["entrepreneurships.id"]),
        sa.ForeignKeyConstraint(["uploaded_by"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documents_entrepreneurship_id", "documents", ["entrepreneurship_id"])
    with op.batch_alter_table(
        "evidence_references",
        table_args=(
            sa.CheckConstraint(
                "kind IN ('link', 'file', 'photograph', 'video')",
                name="ck_evidence_references_kind",
            ),
        ),
    ) as batch:
        batch.alter_column("url", existing_type=sa.String(length=2048), nullable=True)
        batch.add_column(sa.Column("document_id", sa.String(length=36), nullable=True))
        batch.create_foreign_key(
            "fk_evidence_references_document_id", "documents", ["document_id"], ["id"]
        )
        batch.create_check_constraint("ck_evidence_references_source", _SOURCE)
    op.create_index(
        "ix_evidence_references_document_id", "evidence_references", ["document_id"]
    )


def downgrade() -> None:
    # Bases desechables: una evidencia privada no tiene URL que restaurar.
    op.execute("DELETE FROM evidence_references WHERE url IS NULL")
    op.drop_index("ix_evidence_references_document_id", table_name="evidence_references")
    with op.batch_alter_table("evidence_references") as batch:
        batch.drop_constraint("ck_evidence_references_source", type_="check")
        batch.drop_constraint("fk_evidence_references_document_id", type_="foreignkey")
        batch.drop_column("document_id")
        batch.alter_column("url", existing_type=sa.String(length=2048), nullable=False)
    op.drop_index("ix_documents_entrepreneurship_id", table_name="documents")
    op.drop_table("documents")
