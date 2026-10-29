"""Finanzas de Prototipado — US-PRO-003/007–010."""

import sqlalchemy as sa

from alembic import op

revision = "013"
down_revision = "012"
branch_labels = None
depends_on = None

TABLES = (
    "finance_budget_items",
    "finance_purchases",
    "finance_attachments",
    "finance_budget_changes",
    "finance_reconciliations",
    "finance_events",
)


def base():
    return [
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
    ]


def cycle():
    return sa.Column(
        "cycle_id", sa.String(36), sa.ForeignKey("program_cycles.id"), nullable=False, index=True
    )


def actor(name="created_by"):
    return sa.Column(name, sa.String(36), sa.ForeignKey("users.id"), nullable=False)


def text(name, size=200, nullable=False):
    return sa.Column(name, sa.String(size), nullable=nullable)


def money():
    return sa.Column("amount", sa.Numeric(14, 2), nullable=False)


def scope_fk(column):
    return sa.ForeignKeyConstraint(
        [column, "cycle_id", "entrepreneurship_id"],
        [
            "finance_budget_items.id",
            "finance_budget_items.cycle_id",
            "finance_budget_items.entrepreneurship_id",
        ],
    )


def upgrade():
    op.create_table(
        "finance_budget_items",
        *base(),
        cycle(),
        sa.Column(
            "entrepreneurship_id",
            sa.String(36),
            sa.ForeignKey("entrepreneurships.id"),
            nullable=False,
        ),
        text("name"),
        money(),
        sa.Column("revision", sa.Integer, nullable=False),
        actor(),
        sa.CheckConstraint("amount >= 0"),
        sa.UniqueConstraint("id", "cycle_id", "entrepreneurship_id"),
        sa.UniqueConstraint("cycle_id", "name"),
    )
    op.create_table(
        "finance_purchases",
        *base(),
        cycle(),
        sa.Column(
            "entrepreneurship_id",
            sa.String(36),
            sa.ForeignKey("entrepreneurships.id"),
            nullable=False,
        ),
        text("item_id", 36),
        text("kind", 32),
        text("status", 32),
        money(),
        text("supplier"),
        text("invoice_number", 100),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("submission_date", sa.Date),
        sa.Column("executed_on", sa.Date),
        text("fundatec_number", 100),
        sa.Column("checklist", sa.JSON, nullable=False),
        sa.Column("checklist_version", sa.Integer, nullable=False),
        sa.Column("revision", sa.Integer, nullable=False),
        actor(),
        text("request_key", 100),
        scope_fk("item_id"),
        sa.UniqueConstraint("cycle_id", "request_key"),
        sa.CheckConstraint("amount > 0"),
        sa.CheckConstraint("revision > 0"),
        sa.CheckConstraint(
            "kind IN ('factura','reintegro','uso_tc','comision_bancaria','pago_contrato')"
        ),
        sa.CheckConstraint(
            "status IN ('draft','submitted','correction_requested','validated','fundatec','executed','rejected','cancelled')"
        ),
        sa.CheckConstraint("status != 'executed' OR executed_on IS NOT NULL"),
    )
    op.create_table(
        "finance_attachments",
        *base(),
        sa.Column(
            "purchase_id",
            sa.String(36),
            sa.ForeignKey("finance_purchases.id"),
            nullable=False,
            index=True,
        ),
        sa.Column("document_id", sa.String(36), sa.ForeignKey("documents.id"), nullable=False),
        actor(),
        sa.UniqueConstraint("purchase_id", "document_id"),
    )
    op.create_table(
        "finance_budget_changes",
        *base(),
        cycle(),
        sa.Column(
            "entrepreneurship_id",
            sa.String(36),
            sa.ForeignKey("entrepreneurships.id"),
            nullable=False,
        ),
        text("source_id", 36),
        text("target_id", 36),
        money(),
        sa.Column("reason", sa.Text, nullable=False),
        text("status", 20),
        sa.Column("revision", sa.Integer, nullable=False),
        actor(),
        scope_fk("source_id"),
        scope_fk("target_id"),
        sa.CheckConstraint("amount > 0 AND source_id != target_id"),
        sa.CheckConstraint("status IN ('pending','approved','rejected')"),
    )
    op.create_table(
        "finance_reconciliations",
        *base(),
        cycle(),
        text("name"),
        text("sha256", 64),
        text("project_reference", 300),
        sa.Column("results", sa.JSON, nullable=False),
        actor(),
        sa.UniqueConstraint("cycle_id", "sha256"),
    )
    op.create_table(
        "finance_events",
        *base(),
        cycle(),
        text("entity_id", 36),
        text("action", 64),
        sa.Column("observation", sa.Text, nullable=False),
        sa.Column("snapshot", sa.JSON, nullable=False),
        actor("actor_id"),
    )
    op.create_index("ix_finance_events_entity_id", "finance_events", ["entity_id"])
    pg = op.get_bind().dialect.name == "postgresql"
    if pg:
        op.execute("""CREATE FUNCTION finance_history_guard() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Finance history cannot be deleted'; END IF;
          IF TG_TABLE_NAME IN ('finance_events','finance_reconciliations','finance_attachments') THEN RAISE EXCEPTION 'Immutable finance record'; END IF;
          IF OLD.id != NEW.id OR OLD.created_at != NEW.created_at OR OLD.created_by != NEW.created_by THEN RAISE EXCEPTION 'Immutable ownership'; END IF;
          IF OLD.cycle_id != NEW.cycle_id OR OLD.entrepreneurship_id != NEW.entrepreneurship_id THEN RAISE EXCEPTION 'Immutable scope'; END IF;
          IF TG_TABLE_NAME = 'finance_purchases' THEN
            IF OLD.status IN ('executed','cancelled','rejected') THEN RAISE EXCEPTION 'Final purchase'; END IF;
          END IF;
          IF TG_TABLE_NAME = 'finance_budget_changes' THEN
            IF OLD.status != 'pending' THEN RAISE EXCEPTION 'Final budget change'; END IF;
          END IF;
          RETURN NEW;
        END $$""")
        for table in TABLES:
            op.execute(
                f"CREATE TRIGGER finance_history BEFORE UPDATE OR DELETE ON {table} FOR EACH ROW EXECUTE FUNCTION finance_history_guard()"
            )
        op.execute("""CREATE FUNCTION finance_scope_guard() RETURNS trigger LANGUAGE plpgsql AS $$
        BEGIN
          IF TG_TABLE_NAME = 'finance_budget_items' THEN
            IF NOT EXISTS (SELECT 1 FROM program_cycles c JOIN program_enrollments e ON e.id=c.enrollment_id WHERE c.id=NEW.cycle_id AND e.entrepreneurship_id=NEW.entrepreneurship_id AND e.program='Prototipado') THEN RAISE EXCEPTION 'Invalid financial scope'; END IF;
          ELSE
            IF NOT EXISTS (SELECT 1 FROM finance_purchases p JOIN documents d ON d.entrepreneurship_id=p.entrepreneurship_id WHERE p.id=NEW.purchase_id AND d.id=NEW.document_id) THEN RAISE EXCEPTION 'Invalid attachment scope'; END IF;
          END IF;
          RETURN NEW;
        END $$""")
        for table in ("finance_budget_items", "finance_attachments"):
            op.execute(
                f"CREATE TRIGGER finance_scope BEFORE INSERT OR UPDATE ON {table} FOR EACH ROW EXECUTE FUNCTION finance_scope_guard()"
            )
    else:
        for table in TABLES:
            op.execute(
                f"CREATE TRIGGER {table}_no_delete BEFORE DELETE ON {table} BEGIN SELECT RAISE(ABORT, 'Finance history'); END"
            )
            if table in ("finance_events", "finance_reconciliations", "finance_attachments"):
                condition = "1"
            else:
                condition = "OLD.id != NEW.id OR OLD.created_at != NEW.created_at OR OLD.created_by != NEW.created_by OR OLD.cycle_id != NEW.cycle_id OR OLD.entrepreneurship_id != NEW.entrepreneurship_id"
                if table == "finance_purchases":
                    condition += " OR OLD.status IN ('executed','cancelled','rejected')"
                if table == "finance_budget_changes":
                    condition += " OR OLD.status != 'pending'"
            op.execute(
                f"CREATE TRIGGER {table}_history BEFORE UPDATE ON {table} WHEN {condition} BEGIN SELECT RAISE(ABORT, 'Immutable finance history'); END"
            )
        op.execute(
            """CREATE TRIGGER finance_items_scope BEFORE INSERT ON finance_budget_items WHEN NOT EXISTS (SELECT 1 FROM program_cycles c JOIN program_enrollments e ON e.id=c.enrollment_id WHERE c.id=NEW.cycle_id AND e.entrepreneurship_id=NEW.entrepreneurship_id AND e.program='Prototipado') BEGIN SELECT RAISE(ABORT, 'Invalid finance scope'); END"""
        )
        op.execute(
            """CREATE TRIGGER finance_attachment_scope BEFORE INSERT ON finance_attachments WHEN NOT EXISTS (SELECT 1 FROM finance_purchases p JOIN documents d ON d.entrepreneurship_id=p.entrepreneurship_id WHERE p.id=NEW.purchase_id AND d.id=NEW.document_id) BEGIN SELECT RAISE(ABORT, 'Invalid attachment scope'); END"""
        )


def downgrade():
    for table in reversed(TABLES):
        op.drop_table(table)
    if op.get_bind().dialect.name == "postgresql":
        op.execute("DROP FUNCTION finance_history_guard()")
        op.execute("DROP FUNCTION finance_scope_guard()")
